'use client';

import { forwardRef, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { PlayIcon } from '@/components/icons';

export type ChatInputProps = {
  placeholder?: string;
  disabled?: boolean;
  onSubmit: (text: string) => void;
  surfaceLabel?: string;
};

const MAX_ROWS = 6;

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  function ChatInput({ placeholder, disabled, onSubmit, surfaceLabel }, ref) {
    const [value, setValue] = useState('');
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    useLayoutEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = 'auto';
      const lineHeight = 20;
      const maxH = lineHeight * MAX_ROWS + 12;
      el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
      el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
    }, [value]);

    const submit = () => {
      const text = value.trim();
      if (!text || disabled) return;
      setValue('');
      onSubmit(text);
    };

    const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    };

    const setRefs = (el: HTMLTextAreaElement | null) => {
      innerRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    };

    return (
      <div className="border-t border-white/5 bg-black/20">
        {surfaceLabel ? (
          <div className="px-4 pt-2">
            <span className="inline-flex items-center gap-1 px-2 h-5 rounded-sm text-[10px] font-medium uppercase tracking-[0.08em] border bg-white/5 text-text-tertiary border-white/10">
              {surfaceLabel}
            </span>
          </div>
        ) : null}
        <div className="px-3 py-3 flex items-end gap-2">
          <label htmlFor="epau-chat-input" className="sr-only">Message the EPAU Copilot</label>
          <textarea
            id="epau-chat-input"
            ref={setRefs}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder ?? 'Ask about any indicator…'}
            disabled={disabled}
            className="flex-1 resize-none bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-[13px] text-text-primary placeholder:text-text-quat focus-gold scroll-thin leading-5"
          />
          <button
            type="button"
            onClick={submit}
            disabled={disabled || !value.trim()}
            aria-label="Send message"
            className="h-9 w-9 shrink-0 rounded-md border border-gold-300/30 bg-gold-300/10 text-gold-200 hover:bg-gold-300/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <PlayIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  },
);
