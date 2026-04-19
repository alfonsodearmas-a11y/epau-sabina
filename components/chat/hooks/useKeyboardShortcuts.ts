'use client';

import { useEffect, type RefObject } from 'react';

export type KeyboardShortcutArgs = {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onOpenAndFocus: () => void;
  onNewChat: () => void;
  isInsidePanel: (el: Element | null) => boolean;
};

export function useAgentKeyboardShortcuts({
  inputRef,
  onOpenAndFocus,
  onNewChat,
  isInsidePanel,
}: KeyboardShortcutArgs) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + / : open & focus chat input.
      if (mod && e.key === '/' && !e.shiftKey) {
        e.preventDefault();
        onOpenAndFocus();
        return;
      }

      // Cmd/Ctrl + Shift + N while inside the panel: new chat.
      if (mod && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        if (isInsidePanel(document.activeElement)) {
          e.preventDefault();
          onNewChat();
        }
        return;
      }

      // Esc while focused in the input: blur.
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        e.preventDefault();
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [inputRef, onOpenAndFocus, onNewChat, isInsidePanel]);
}
