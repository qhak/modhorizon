/** ModHorizon's mark: a block floating above a planet horizon. Mirrors src/app/icon.svg. */
export function BrandMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="#070a12" />
      <path d="M0 52Q32 38 64 52A12 12 0 0 1 52 64H12A12 12 0 0 1 0 52Z" fill="#0f1d3d" />
      <path d="M0 52Q32 38 64 52" fill="none" stroke="#5090ff" strokeOpacity=".35" strokeWidth="5" />
      <path d="M0 52Q32 38 64 52" fill="none" stroke="#b9cfff" strokeWidth="1.6" />
      <path d="M32 12 44 19 32 26 20 19Z" fill="#e3ecff" />
      <path d="M20 19 32 26V38L20 31Z" fill="#6aa3ff" />
      <path d="M44 19 32 26V38L44 31Z" fill="#3a6fd8" />
    </svg>
  );
}
