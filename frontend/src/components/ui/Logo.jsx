import { cx } from '../../lib/tone.js';

/** The MMRMS mark — institution logo inside a rounded tile. */
export function Logo({ className, size = 'md' }) {
  const sizes = {
    sm: 'h-8 w-8 rounded-[8px]',
    md: 'h-9 w-9 rounded-[10px]',
    lg: 'h-11 w-11 rounded-[12px]',
  };

  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex items-center justify-center overflow-hidden bg-transparent transition-all duration-300',
        sizes[size],
        className,
      )}
    >
      <img
        src="/KCT-LOGO.jpg"
        alt="KCT Logo"
        className="h-full w-full object-cover rounded-[inherit]"
        onError={(e) => {
          if (!e.currentTarget.dataset.triedPng) {
            e.currentTarget.dataset.triedPng = 'true';
            e.currentTarget.src = '/KCT-LOGO.png';
            return;
          }
          // Fallback: hide broken image, show parent with M text
          e.currentTarget.style.display = 'none';
          e.currentTarget.parentElement.classList.add(
            'bg-brand-gradient',
            'font-bold',
            'text-white',
            'text-base',
            'tracking-tight'
          );
          e.currentTarget.parentElement.textContent = 'M';
        }}
      />
    </span>
  );
}
