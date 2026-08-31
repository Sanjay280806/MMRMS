import { Logo } from '../ui/Logo.jsx';

/** The dark left half of the sign-in screen. Hidden below `lg`. */
export function BrandPanel({ institution, roles }) {
  return (
    <div className="relative hidden w-[55%] flex-col justify-between overflow-hidden bg-ink px-14 py-12 text-white lg:flex">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,.45), transparent 62%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-44 -right-24 h-[460px] w-[460px] rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,.28), transparent 65%)' }}
      />
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-40">
        <defs>
          <pattern id="mmrms-grid" width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M 46 0 L 0 0 0 46" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mmrms-grid)" />
      </svg>

      <div className="relative flex items-center gap-3">
        <Logo size="lg" />
        <div className="leading-tight">
          <div className="font-display text-[20px] font-semibold tracking-[.01em]">MMRMS</div>
          <div className="text-[11px] tracking-[.06em] text-white/45">{institution?.tagline}</div>
        </div>
      </div>

      <div className="relative max-w-[440px]">
        <h2 className="font-display text-[42px] font-semibold leading-[1.14] tracking-[-0.02em]">
          {institution?.name ?? 'Kumaraguru College of Technology'}
        </h2>
        <p className="mt-4 max-w-[380px] text-[14.5px] leading-relaxed text-white/60">
          {institution?.pitch}
        </p>
      </div>

      <div className="relative text-[11.5px] text-white/30">
        © 2026 MMRMS · {institution?.name ?? 'Kumaraguru College of Technology'}
      </div>
    </div>
  );
}
