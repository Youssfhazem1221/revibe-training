'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { syncEarnedBadges } from '@/lib/badges';

const BadgeCelebrationContext = createContext({
  checkForBadges: async () => {}
});

export const useBadgeCelebration = () => useContext(BadgeCelebrationContext);

// A few confetti pieces with varied positions/colors/delays.
const CONFETTI = Array.from({ length: 28 }).map((_, i) => ({
  id: i,
  left: (i * 3.5) % 100,
  color: ['#FF2E63', '#7C3AED', '#FFB800', '#10B981', '#3B82F6'][i % 5],
  delay: (i % 7) * 0.12,
  duration: 2.4 + (i % 5) * 0.35,
  size: 7 + (i % 4) * 2
}));

export function BadgeCelebrationProvider({ children }) {
  const [queue, setQueue] = useState([]);

  // Recompute badges for the user and enqueue any newly earned ones.
  const checkForBadges = useCallback(async (uid) => {
    if (!uid) return;
    const newBadges = await syncEarnedBadges(uid);
    if (newBadges.length > 0) {
      setQueue(prev => [...prev, ...newBadges]);
    }
  }, []);

  const current = queue[0];
  const dismiss = () => setQueue(prev => prev.slice(1));

  return (
    <BadgeCelebrationContext.Provider value={{ checkForBadges }}>
      {children}
      {current && (
        <div className="badge-celebration-overlay" onClick={dismiss} role="dialog" aria-modal="true">
          {/* Confetti */}
          <div className="badge-confetti" aria-hidden="true">
            {CONFETTI.map(c => (
              <span
                key={c.id}
                style={{
                  left: `${c.left}%`,
                  background: c.color,
                  width: `${c.size}px`,
                  height: `${c.size}px`,
                  animationDelay: `${c.delay}s`,
                  animationDuration: `${c.duration}s`
                }}
              />
            ))}
          </div>

          <div className="badge-celebration-card" onClick={e => e.stopPropagation()}>
            <div className="badge-celebration-eyebrow">Achievement unlocked!</div>

            <div className="badge-medallion" style={{ '--badge-color': current.color }}>
              <div className="badge-medallion-glow" />
              <i className="material-icons">{current.icon}</i>
            </div>

            <h2 className="badge-celebration-name">{current.name}</h2>
            <p className="badge-celebration-desc">{current.description}</p>

            <button className="badge-celebration-btn" onClick={dismiss}>
              {queue.length > 1 ? 'Next' : 'Awesome!'}
            </button>
            {queue.length > 1 && (
              <div className="badge-celebration-more">+{queue.length - 1} more badge{queue.length - 1 > 1 ? 's' : ''}</div>
            )}
          </div>

          <style jsx>{`
            .badge-celebration-overlay {
              position: fixed;
              inset: 0;
              z-index: 2000;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(17, 24, 39, 0.72);
              backdrop-filter: blur(6px);
              -webkit-backdrop-filter: blur(6px);
              animation: badgeFade 0.25s ease-out;
              overflow: hidden;
            }
            @keyframes badgeFade { from { opacity: 0; } to { opacity: 1; } }

            .badge-celebration-card {
              position: relative;
              z-index: 2;
              width: 90%;
              max-width: 440px;
              padding: 40px 32px 32px;
              border-radius: 28px;
              background: #ffffff;
              text-align: center;
              box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
              animation: badgePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            @keyframes badgePop {
              0% { transform: scale(0.6) translateY(30px); opacity: 0; }
              100% { transform: scale(1) translateY(0); opacity: 1; }
            }

            .badge-celebration-eyebrow {
              font-family: var(--font-poppins), sans-serif;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: var(--accent-pink, #ff2e63);
              margin-bottom: 20px;
            }

            .badge-medallion {
              position: relative;
              width: 120px;
              height: 120px;
              margin: 0 auto 24px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              background: var(--badge-color, #7c3aed);
              box-shadow: 0 12px 40px color-mix(in srgb, var(--badge-color, #7c3aed) 50%, transparent);
              animation: badgeSpinIn 0.7s ease-out;
            }
            @keyframes badgeSpinIn {
              0% { transform: rotate(-25deg) scale(0.4); opacity: 0; }
              60% { transform: rotate(8deg) scale(1.1); }
              100% { transform: rotate(0) scale(1); opacity: 1; }
            }
            .badge-medallion :global(i.material-icons) {
              font-size: 60px;
              color: #fff;
              z-index: 1;
            }
            .badge-medallion-glow {
              position: absolute;
              inset: -8px;
              border-radius: 50%;
              background: var(--badge-color, #7c3aed);
              opacity: 0.35;
              animation: badgePulse 1.8s ease-in-out infinite;
            }
            @keyframes badgePulse {
              0%, 100% { transform: scale(1); opacity: 0.3; }
              50% { transform: scale(1.18); opacity: 0.08; }
            }

            .badge-celebration-name {
              font-family: var(--font-poppins), sans-serif;
              font-size: 26px;
              font-weight: 800;
              color: var(--text-primary, #111827);
              margin: 0 0 8px;
            }
            .badge-celebration-desc {
              font-size: 15px;
              line-height: 1.5;
              color: var(--text-muted, #6b7280);
              margin: 0 0 28px;
            }

            .badge-celebration-btn {
              width: 100%;
              padding: 14px;
              border: none;
              border-radius: 14px;
              font-family: var(--font-poppins), sans-serif;
              font-size: 16px;
              font-weight: 700;
              color: #fff;
              cursor: pointer;
              background: linear-gradient(135deg, #ff2e63 0%, #7c3aed 100%);
              transition: filter 0.18s ease, transform 0.18s ease;
            }
            .badge-celebration-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }

            .badge-celebration-more {
              margin-top: 12px;
              font-size: 13px;
              color: var(--text-muted, #9ca3af);
              font-weight: 600;
            }

            .badge-confetti {
              position: absolute;
              inset: 0;
              z-index: 1;
              pointer-events: none;
            }
            .badge-confetti :global(span) {
              position: absolute;
              top: -20px;
              border-radius: 2px;
              animation-name: confettiFall;
              animation-timing-function: linear;
              animation-iteration-count: infinite;
            }
            @keyframes confettiFall {
              0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(105vh) rotate(720deg); opacity: 0.9; }
            }
          `}</style>
        </div>
      )}
    </BadgeCelebrationContext.Provider>
  );
}
