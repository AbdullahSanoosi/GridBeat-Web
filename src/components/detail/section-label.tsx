export function SectionLabel({ label }: { label: string }) {
  return (
    <h2 className="mb-2 text-xs font-bold tracking-widest text-(--color-text-muted)">
      {label.toUpperCase()}
    </h2>
  );
}
