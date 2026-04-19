import { describe, expect, it } from 'vitest';
import { listSavedViews, getSavedView, type SavedViewsDb, type SavedViewDetail, type SavedViewSummary } from './saved_views';
import { isToolError } from '../types';

const summary = (id: string, overrides: Partial<SavedViewSummary> = {}): SavedViewSummary => ({
  id,
  name: `view ${id}`,
  queryText: 'show nrf',
  indicatorIds: ['nrf_balance'],
  lastRunAt: null,
  createdAt: '2024-02-01T00:00:00Z',
  ...overrides,
});

const detail = (id: string, ownerEmail: string): SavedViewDetail => ({
  ...summary(id),
  config: { chartType: 'area' },
  ownerEmail,
});

function makeDb(opts: {
  views?: SavedViewSummary[];
  details?: Record<string, SavedViewDetail>;
  allowlist?: string[];
}): SavedViewsDb {
  const views = opts.views ?? [];
  const details = opts.details ?? {};
  const allowlist = (opts.allowlist ?? []).map((x) => x.toLowerCase());
  return {
    async listSavedViews({ userEmail }) { return views.filter(() => userEmail); },
    async getSavedView(id) { return details[id] ?? null; },
    async isEmailAllowed(email) { return allowlist.includes(email.toLowerCase()); },
  };
}

describe('list_saved_views', () => {
  it('happy: returns views for allowed email', async () => {
    const db = makeDb({ views: [summary('a'), summary('b')], allowlist: ['sabina@example.com'] });
    const r = await listSavedViews({ user_email: 'sabina@example.com' }, db);
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.views).toHaveLength(2);
  });

  it('failure: forbidden when email not on allowlist', async () => {
    const db = makeDb({ allowlist: ['someone@else.com'] });
    const r = await listSavedViews({ user_email: 'sabina@example.com' }, db);
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('forbidden');
  });

  it('edge: empty email is invalid_input', async () => {
    const db = makeDb({ allowlist: ['sabina@example.com'] });
    const r = await listSavedViews({ user_email: '' }, db);
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('invalid_input');
  });
});

describe('get_saved_view', () => {
  it('happy: fetch by id', async () => {
    const db = makeDb({ details: { a: detail('a', 'sabina@example.com') } });
    const r = await getSavedView({ id: 'a' }, db);
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.id).toBe('a');
    expect(r.ownerEmail).toBe('sabina@example.com');
  });

  it('failure: unknown id', async () => {
    const db = makeDb({});
    const r = await getSavedView({ id: 'nope' }, db);
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('saved_view_not_found');
  });

  it('edge: forbidden when requester_email mismatches owner', async () => {
    const db = makeDb({ details: { a: detail('a', 'sabina@example.com') } });
    const r = await getSavedView({ id: 'a', requester_email: 'intruder@x.com' }, db);
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('forbidden');
  });
});
