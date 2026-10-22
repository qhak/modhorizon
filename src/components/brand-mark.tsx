/** ModHorizon's mark: stacked block layers. src/app/icon.svg puts it on a dark tile. */
export function BrandMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="7 6.25 50 50" width={size} height={size} className={className} aria-hidden="true">
      <path d="M32 10 52 21.5 32 33 12 21.5Z" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M12 29 32 40.5 52 29M12 39.5 32 51 52 39.5" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
