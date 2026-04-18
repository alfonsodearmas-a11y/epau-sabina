export default function DeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass-strong rounded-lg p-8 max-w-md text-center">
        <h1 className="font-serif text-[28px] mb-2">Access denied</h1>
        <p className="text-[13px] text-text-secondary">
          This workbench is restricted to members of the Economic Policy and Analysis Unit.
          If you believe you should have access, contact the unit head.
        </p>
      </div>
    </div>
  );
}
