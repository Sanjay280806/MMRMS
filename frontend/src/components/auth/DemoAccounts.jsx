/**
 * Seeded accounts, one per role. Clicking one fills the form — the sign-in
 * request still goes through the real API.
 */
const ACCOUNTS = [
  { role: 'mentor', email: 'bharathi.priya@kct.ac.in' },
  { role: 'student', email: 'abhinav.dinesh@kct.ac.in' },
];

const PASSWORD = 'mmrms@2026';

export function DemoAccounts({ roles, onPick }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-line-strong bg-brand-gradient-subtle p-5 shadow-inner">
      <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-muted-soft">
        Demo accounts · password {PASSWORD}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {ACCOUNTS.map((account) => {
          const role = roles?.find((r) => r.key === account.role);
          return (
            <button
              key={account.role}
              type="button"
              onClick={() => onPick({ ...account, password: PASSWORD })}
              title={account.email}
              className="focus-ring rounded-full border border-line bg-white px-3 py-1.5 text-[11.5px] font-semibold text-muted shadow-inner transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-500 hover:shadow-pop"
            >
              {role?.name ?? account.role}
              {!role?.target && <span className="ml-1.5 text-muted-faint">· no dashboard</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
