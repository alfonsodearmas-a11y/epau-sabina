'use client';

export function StatusLine({ message }: { message: string }) {
  return (
    <div
      aria-live="polite"
      className="flex items-center gap-2 text-[11.5px] text-text-tertiary italic"
    >
      <span className="relative flex w-1.5 h-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-gold-300/60 opacity-75 animate-ping" />
        <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-gold-300" />
      </span>
      {message}
    </div>
  );
}
