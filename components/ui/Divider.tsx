// Horizontal divider.

export interface DividerProps {
  className?: string;
}

export function Divider({ className = '' }: DividerProps) {
  return <div className={`h-px bg-white/[0.06] ${className}`} />;
}
