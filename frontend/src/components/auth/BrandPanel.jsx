import { Logo } from '../ui/Logo.jsx';

/** The dark left half of the sign-in screen. Hidden below `lg`. */
export function BrandPanel({ institution, roles }) {
  return (
    <div className="relative hidden w-[55%] flex-col justify-between overflow-hidden bg-ink px-14 py-12 text-white lg:flex">

      {/* ── KCT campus / brand image — sits behind everything at low opacity ── */}
      <img
        src="/KCT-LOGIN.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-150 mix-blend-luminosity"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />

      {/* ── Dark navy overlay to keep the text 100% legible over the photo ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/85 to-ink/75"
      />

      {/* ── Brand glow blobs ── */}
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

      {/* ── Dot grid ── */}
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-40">
        <defs>
          <pattern id="mmrms-grid" width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M 46 0 L 0 0 0 46" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mmrms-grid)" />
      </svg>

      {/* ── Top Section: Logo + Heading & Description right below it ── */}
      <div className="relative space-y-7">
        <div className="flex items-center gap-3">
          <Logo size="lg" />
          <div className="leading-tight">
            <div className="font-display text-[21px] font-bold tracking-[.01em] text-white drop-shadow-sm">MMRMS</div>
            <div className="text-[12px] font-medium tracking-[.04em] text-white/85 drop-shadow-sm">{institution?.tagline}</div>
          </div>
        </div>

        <div className="max-w-[460px]">
          <h2 className="font-display text-[38px] font-bold leading-[1.15] tracking-[-0.02em] text-white drop-shadow-md xl:text-[42px]">
            {institution?.name ?? 'Kumaraguru College of Technology'}
          </h2>
          <p className="mt-4 max-w-[400px] text-[15px] font-medium leading-relaxed text-white/95 drop-shadow-sm">
            {institution?.pitch}
          </p>
        </div>
      </div>

      <div className="relative text-[12px] font-medium text-white/50">
        © 2026 MMRMS · {institution?.name ?? 'Kumaraguru College of Technology'}
      </div>
    </div>
  );
}
