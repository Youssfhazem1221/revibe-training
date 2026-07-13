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
          <div className="login-brand">
            <div className="login-logo gradient-text">REVIBE</div>
            <div className="login-subtitle font-poppins text-muted text-h3 font-medium">Training Hub</div>
          </div>
          <p className="login-tagline text-small text-muted italic mb-8">&ldquo;Like new, but waaaay better at learning&rdquo; 🚀</p>

          <div className="login-form">
            <button onClick={handleLogin} className="login-btn">
              <span className="btn-text">
                <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </span>
            </button>
            {error && <div className="login-error visible">{error}</div>}
          </div>

          <div className="login-footer mt-8 text-small text-muted">
            Powered by <a href="https://revibe.me" target="_blank" rel="noopener noreferrer" className="text-accent-purple font-semibold hover:text-accent-pink transition-colors">REVIBE</a>
          </div>
        </div>
      </div>
    </div>
  );
}
