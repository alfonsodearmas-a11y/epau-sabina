// list_saved_views and get_saved_view. Scoped by user_email; defense-in-depth check below middleware.

import type { ToolError } from '../types';

export type SavedViewSummary = {
  id: string;
  name: string;
  queryText: string;
  indicatorIds: string[];
  lastRunAt: string | null;
  createdAt: string;
};

export type SavedViewDetail = SavedViewSummary & {
  config: unknown | null;
  ownerEmail: string;
};

export interface SavedViewsDb {
  listSavedViews(args: { userEmail: string; limit: number }): Promise<SavedViewSummary[]>;
  getSavedView(id: string): Promise<SavedViewDetail | null>;
  isEmailAllowed(email: string): Promise<boolean>;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type ListSavedViewsInput = { user_email: string; limit?: number };
export type ListSavedViewsResult =
  | { views: SavedViewSummary[] }
  | ToolError<'forbidden' | 'fetch_failed' | 'invalid_input'>;

export async function listSavedViews(
  input: ListSavedViewsInput,
  db: SavedViewsDb,
): Promise<ListSavedViewsResult> {
  const email = (input.user_email ?? '').trim().toLowerCase();
  if (!email) return { error: 'invalid_input', detail: 'user_email is required' };

  const allowed = await db.isEmailAllowed(email);
  if (!allowed) return { error: 'forbidden', detail: 'user_email is not on the allowlist' };

  const limit = Math.max(1, Math.min(MAX_LIMIT, input.limit ?? DEFAULT_LIMIT));
  try {
    const views = await db.listSavedViews({ userEmail: email, limit });
    return { views };
  } catch (err) {
    return { error: 'fetch_failed', detail: err instanceof Error ? err.message : String(err) };
  }
}

export type GetSavedViewInput = { id: string; requester_email?: string };
export type GetSavedViewResult =
  | SavedViewDetail
  | ToolError<'saved_view_not_found' | 'forbidden' | 'fetch_failed' | 'invalid_input'>;

export async function getSavedView(
  input: GetSavedViewInput,
  db: SavedViewsDb,
): Promise<GetSavedViewResult> {
  const id = (input.id ?? '').trim();
  if (!id) return { error: 'invalid_input', detail: 'id is required' };
  try {
    const view = await db.getSavedView(id);
    if (!view) return { error: 'saved_view_not_found', id };

    // Defense in depth: if a requester email is supplied and it does not match the owner, deny.
    if (input.requester_email) {
      const rq = input.requester_email.trim().toLowerCase();
      const owner = view.ownerEmail.trim().toLowerCase();
      if (rq !== owner) return { error: 'forbidden', detail: 'requester is not the owner of this view' };
    }

    return view;
  } catch (err) {
    return { error: 'fetch_failed', detail: err instanceof Error ? err.message : String(err) };
  }
}
