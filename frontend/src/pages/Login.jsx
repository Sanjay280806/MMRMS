import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { homeFor } from '../auth/RequireRole.jsx';
import { useResource } from '../hooks/useResource.js';
import { Button } from '../components/ui/Button.jsx';
import { TextField } from '../components/ui/Field.jsx';
import { Logo } from '../components/ui/Logo.jsx';
import { BrandPanel } from '../components/auth/BrandPanel.jsx';
import { PasswordRules } from '../components/auth/PasswordRules.jsx';
import { DemoAccounts } from '../components/auth/DemoAccounts.jsx';
import { AlertBanner } from '../components/auth/AlertBanner.jsx';

export default function Login() {
  const { login, isAuthenticated, user, restoring } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: context } = useResource('/auth/context');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [lockedFor, setLockedFor] = useState(0);

  // Tick the lockout countdown returned by the API.
  useEffect(() => {
    if (lockedFor <= 0) return undefined;
    const id = setInterval(() => setLockedFor((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [lockedFor]);

  const locked = lockedFor > 0;
  const canSubmit = email.trim() && password && !submitting && !locked;

  const lockText = useMemo(() => {
    const mm = Math.floor(lockedFor / 60);
    const ss = lockedFor % 60;
    return `${mm}:${String(ss).padStart(2, '0')}`;
  }, [lockedFor]);

  if (restoring) return null;
  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname ?? homeFor(user.role)} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await login(email.trim(), password);
      navigate(location.state?.from?.pathname ?? homeFor(result.user.role), { replace: true });
    } catch (err) {
      if (err.status === 423) {
        setLockedFor(err.body?.retryInSeconds ?? 900);
        setError(null);
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <BrandPanel institution={context?.institution} roles={context?.roles} />

      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-[45%] lg:px-14">
        <div className="w-full max-w-[400px] animate-fadeRise">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo />
            <div className="leading-tight">
              <div className="text-[15px] font-bold tracking-[.02em]">MMRMS</div>
              <div className="text-[10.5px] tracking-[.05em] text-muted-soft">
                {context?.institution?.tagline}
              </div>
            </div>
          </div>

          <h1 className="hero-title text-[28px]">Sign in to MMRMS</h1>
          <p className="hero-subtitle">Access your mentoring workspace</p>

          {error && <AlertBanner tone="rose" className="mt-5" title={error} />}
          {locked && (
            <AlertBanner
              tone="amber"
              className="mt-5"
              title="Account locked for 15 minutes"
              description={
                <>
                  Too many failed attempts. Try again in{' '}
                  <strong className="tnum font-semibold text-warn-ink">{lockText}</strong>.
                </>
              }
            />
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Institutional email"
              type="email"
              autoComplete="username"
              placeholder="you@kct.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="focus-ring rounded px-1.5 py-1 text-[11px] font-semibold text-muted hover:text-brand-500"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              }
            />

            <PasswordRules password={password} />

            <div className="flex justify-end">
              <a href="#reset" className="link-accent text-[12.5px]">
                Forgot password?
              </a>
            </div>

            <Button type="submit" size="lg" loading={submitting} disabled={!canSubmit}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3.5">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[11.5px] text-muted-faint">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <Button variant="secondary" size="lg" disabled title="Single sign-on is not configured">
            <MicrosoftMark />
            Continue with Microsoft
          </Button>

          <DemoAccounts
            roles={context?.roles}
            onPick={(account) => {
              setEmail(account.email);
              setPassword(account.password);
              setError(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function MicrosoftMark() {
  return (
    <span aria-hidden="true" className="grid grid-cols-2 gap-[2px]">
      <span className="h-2 w-2 bg-[#F25022]" />
      <span className="h-2 w-2 bg-[#7FBA00]" />
      <span className="h-2 w-2 bg-[#00A4EF]" />
      <span className="h-2 w-2 bg-[#FFB900]" />
    </span>
  );
}
