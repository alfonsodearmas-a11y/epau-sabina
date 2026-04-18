// Stat tile shown in the admin dashboard grid.

export interface StatCardProps {
  label: string;
  value: string;
  span?: 1 | 2;
}

export function StatCard({ label, value, span = 1 }: StatCardProps) {
  return (
    <div className={`glass rounded-lg p-4 ${span === 2 ? 'col-span-2' : ''}`}>
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary">
        {label}
      </div>
      <div className="font-serif text-[22px] text-text-primary mt-1 leading-tight num">
        {value}
      </div>
    </div>
  );
}
