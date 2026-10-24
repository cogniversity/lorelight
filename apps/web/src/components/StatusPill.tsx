export function StatusPill({ status }: { status: string }) {
  const slug = status.toLowerCase().replace(/\s/g, "-");
  return (
    <span className={`status status-${slug}`}>
      <i />
      {status}
    </span>
  );
}
