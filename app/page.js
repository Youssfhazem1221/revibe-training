'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader, Spinner } from '@/components/ui';
import { APP_VERSION } from '@/lib/version';
import './login.css';

const HIGHLIGHTS = [
  { icon: 'auto_stories', title: 'Every deck in one place', text: 'Onboarding, quality, ops and policy, always current.' },
  { icon: 'trending_up', title: 'Pick up where you left off', text: 'Your progress saves on every slide.' },
  { icon: 'workspace_premium', title: 'Earn badges & certificates', text: 'Show what you have mastered.' },
];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.28-.98 2.36-2.09 3.09l3.38 2.62c1.97-1.82 3.11-4.5 3.11-7.71 0-.75-.07-1.47-.2-2.16H12z" />
      <path fill="#34A853" d="M6.53 14.29l-.76.58-2.7 2.1C4.79 20.4 8.11 22.5 12 22.5c2.7 0 4.96-.89 6.62-2.42l-3.38-2.62c-.89.6-2.03.96-3.24.96-2.5 0-4.62-1.68-5.38-3.94l-.09-.19z" />
      <path fill="#FBBC05" d="M3.07 7.03C2.39 8.38 2 9.9 2 11.5s.39 3.12 1.07 4.47c0 .01 3.46-2.69 3.46-2.69-.2-.6-.32-1.24-.32-1.9s.12-1.3.32-1.9L3.07 7.03z" />
      <path fill="#4285F4" d="M12 5.98c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.95 3.09 14.7 2.5 12 2.5c-3.89 0-7.21 2.1-9.03 5.03l3.46 2.69C7.38 7.66 9.5 5.98 12 5.98z" />
    </svg>
  );
}

export default function LoginPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (user && !loading) router.replace('/dashboard');
  }, [user, loading, router]);

  const handleLogin = async () => {
    setError('');
    setSigningIn(true);
    try {
      await signInWithGoogle();
      // Redirect happens in the effect above once auth state updates.
    } catch (err) {
      const cancelled = err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request';
      setError(cancelled ? 'Sign-in was cancelled. Give it another go.' : 'We couldn’t sign you in. Please try again.');
      console.error(err);
      setSigningIn(false);
    }
  };

  if (loading || user) return <PageLoader label="Signing you in" />;

  return (
    <main className="login">
      <title>Sign in · Revibe Training</title>

      <section className="login-hero" aria-hidden="true">
        <div className="login-hero-glow" />
        <div className="login-hero-inner">
          <div className="wordmark login-hero-mark">
            <span className="wordmark-logo">REVIBE</span>
            <span className="wordmark-product">Training Hub</span>
          </div>

          <div className="login-hero-copy">
            <h1>
              Learn the Revibe way.
              <span>Like new, but waaaay smarter.</span>
            </h1>
            <ul className="login-highlights stagger">
              {HIGHLIGHTS.map((h) => (
                <li key={h.title}>
                  <span className="login-highlight-icon"><i className="material-icons">{h.icon}</i></span>
                  <span>
                    <strong>{h.title}</strong>
                    <small>{h.text}</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="login-hero-stickers">
            <span className="sticker s1"><i className="material-icons">verified</i></span>
            <span className="sticker s2"><i className="material-icons">bolt</i></span>
            <span className="sticker s3"><i className="material-icons">favorite</i></span>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card animate-fade-in-up">
          <div className="wordmark login-card-mark">
            <span className="wordmark-logo">REVIBE</span>
            <span className="wordmark-product">Training</span>
          </div>

          <h2 className="login-title">Welcome back</h2>
          <p className="login-sub">Sign in with your Revibe Google account to continue learning.</p>

          <button onClick={handleLogin} className="login-google" disabled={signingIn}>
            {signingIn ? <Spinner size="sm" /> : <GoogleIcon />}
            <span>{signingIn ? 'Opening Google…' : 'Continue with Google'}</span>
          </button>

          {error && (
            <div className="login-error" role="alert">
              <i className="material-icons">error_outline</i>
              {error}
            </div>
          )}

          <p className="login-foot">
            <i className="material-icons">lock</i>
            Secure sign-in with Google. We never see your password.
          </p>
          <p className="login-version">Revibe Training Hub · v{APP_VERSION}</p>
        </div>
      </section>
    </main>
  );
}
