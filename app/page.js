'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import './login.css';

export default function LoginPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setParticles(
        Array.from({ length: 20 }).map((_, i) => ({
          id: i,
          left: Math.random() * 100 + '%',
          size: Math.random() * 4 + 3 + 'px',
          duration: Math.random() * 10 + 8 + 's',
          delay: Math.random() * 8 + 's',
        }))
      );
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleLogin = async () => {
    setError('');
    try {
      await signInWithGoogle();
      // Redirect handled by useEffect
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      console.error(err);
    }
  };

  if (loading || user) return null; // Or a loading spinner

  return (
    <div className="login-page">
      <div className="login-particles">
        {particles.map(p => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay
            }}
          />
        ))}
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L3 7v6c0 5.25 3.75 9.75 9 11 5.25-1.25 9-5.75 9-11V7l-9-5z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="login-brand">
            <div className="login-eyebrow">REVIBE</div>
            <h1 className="login-title">Training Hub</h1>
            <p className="login-tagline">
              Sign in to continue learning, track your progress, and earn badges as you go.
            </p>
          </div>

          <div className="login-form">
            <button onClick={handleLogin} className="login-btn" aria-label="Sign in with Google">
              <span className="btn-text">
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.28-.98 2.36-2.09 3.09l3.38 2.62c1.97-1.82 3.11-4.5 3.11-7.71 0-.75-.07-1.47-.2-2.16H12z" />
                  <path fill="#34A853" d="M6.53 14.29l-.76.58-2.7 2.1C4.79 20.4 8.11 22.5 12 22.5c2.7 0 4.96-.89 6.62-2.42l-3.38-2.62c-.89.6-2.03.96-3.24.96-2.5 0-4.62-1.68-5.38-3.94l-.09-.19z" />
                  <path fill="#FBBC05" d="M3.07 7.03C2.39 8.38 2 9.9 2 11.5s.39 3.12 1.07 4.47c0 .01 3.46-2.69 3.46-2.69-.2-.6-.32-1.24-.32-1.9s.12-1.3.32-1.9L3.07 7.03z" />
                  <path fill="#4285F4" d="M12 5.98c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.95 3.09 14.7 2.5 12 2.5c-3.89 0-7.21 2.1-9.03 5.03l3.46 2.69C7.38 7.66 9.5 5.98 12 5.98z" />
                </svg>
                Continue with Google
              </span>
            </button>
            {error && <div className="login-error visible" role="alert">{error}</div>}
          </div>

          <div className="login-footer">
            Secure sign-in · Powered by Google
          </div>
        </div>
      </div>
    </div>
  );
}
