export function Progress({ value, tone = "gold" }: { value: number; tone?: string }) {
  return (
    <div className="progress-track">
      <span className={`progress-${tone}`} style={{ width: `${value}%` }} />
    </div>
  );
}
