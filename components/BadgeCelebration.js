'use client';

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { syncEarnedBadges } from '@/lib/badges';

const BadgeCelebrationContext = createContext({
  checkForBadges: async () => {}
});

export const useBadgeCelebration = () => useContext(BadgeCelebrationContext);

const CONFETTI_COLORS = ['#C82D8C', '#7F19A0', '#5019A0', '#A267F4', '#FF6400', '#FFB800', '#EADBFF'];

/**
 * One-shot confetti burst on a full-screen canvas. Brand colours, ~2.5s,
 * no dependencies. Returns a cleanup that stops the animation.
 */
function confettiBurst(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  const w = window.innerWidth;
  const h = window.innerHeight;
  const count = w < 600 ? 90 : 150;
  const origins = [
    { x: w * 0.5, y: h * 0.42, spread: Math.PI * 2, power: [6, 13] },
    { x: 0, y: h * 0.75, spread: Math.PI / 3, angle: -Math.PI / 3.2, power: [10, 18] },
    { x: w, y: h * 0.75, spread: Math.PI / 3, angle: -Math.PI + Math.PI / 3.2, power: [10, 18] },
  ];
  const rand = (a, b) => a + Math.random() * (b - a);
  const particles = Array.from({ length: count }, (_, i) => {
    const o = origins[i % 3 === 0 ? 0 : i % 3];
    const angle = o.spread === Math.PI * 2 ? rand(0, Math.PI * 2) : (o.angle + rand(-o.spread / 2, o.spread / 2));
    const speed = rand(o.power[0], o.power[1]);
    return {
      x: o.x,
      y: o.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (o.spread === Math.PI * 2 ? 3 : 0),
      size: rand(6, 11),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.25, 0.25),
      wobble: rand(0, Math.PI * 2),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      shape: i % 4 === 0 ? 'circle' : i % 5 === 0 ? 'ribbon' : 'rect',
    };
  });

  const DURATION = 2600;
  const start = performance.now();
  let raf = 0;
  const tick = (now) => {
    const t = now - start;
    ctx.clearRect(0, 0, w, h);
    const fade = t > DURATION - 700 ? Math.max(0, (DURATION - t) / 700) : 1;
    for (const p of particles) {
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.32;
      p.x += p.vx + Math.sin(p.wobble) * 0.6;
      p.y += p.vy;
      p.rot += p.vr;
      p.wobble += 0.08;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'ribbon') {
        ctx.fillRect(-p.size, -p.size / 6, p.size * 2, p.size / 3);
      } else {
        ctx.scale(1, Math.cos(p.wobble));
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      }
      ctx.restore();
    }
    if (t < DURATION) raf = requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, w, h);
  };
  raf = requestAnimationFrame(tick);
  window.addEventListener('resize', resize);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
}

function CelebrationDialog({ badge, position, total, onNext, onSkipAll }) {
  const router = useRouter();
  const pathname = usePathname();
  const canvasRef = useRef(null);
  const dialogRef = useRef(null);
  const primaryRef = useRef(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const remaining = total - position;
  const onBadgesPage = pathname === '/dashboard/my-learning';

  // Scroll lock + restore focus to wherever it was when the dialog opened.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, []);

  // Each new badge: focus the main action and fire confetti (unless reduced motion).
  useEffect(() => {
    primaryRef.current?.focus();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !canvasRef.current) return undefined;
    return confettiBurst(canvasRef.current);
  }, [badge.id]);

  // Esc dismisses; Tab stays inside the dialog.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onNext();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll('button, [href]');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext]);

  const goToBadges = () => {
    onSkipAll();
    router.push('/dashboard/my-learning#badges');
  };

  return (
    <div className="bc-overlay" onMouseDown={(e) => e.target === e.currentTarget && onNext()}>
      <canvas ref={canvasRef} className="bc-confetti" aria-hidden="true" />

      <div
        ref={dialogRef}
        key={badge.id}
        className="bc-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <button type="button" className="bc-close" onClick={onSkipAll} aria-label="Close">
          <i className="material-icons">close</i>
        </button>

        <div className="bc-stage" aria-hidden="true">
          <span className="bc-sticker bc-sticker-1"><i className="material-icons">star</i></span>
          <span className="bc-sticker bc-sticker-2"><i className="material-icons">auto_awesome</i></span>
          <span className="bc-sticker bc-sticker-3" />
          <span className="bc-sticker bc-sticker-4" />
          <span className="bc-rays" />
          <span className="bc-medal" style={{ '--badge-color': badge.color }}>
            <span className="bc-medal-core">
              <i className="material-icons">{badge.icon}</i>
            </span>
          </span>
        </div>

        <div className="bc-body">
          <span className="bc-eyebrow">
            Badge unlocked{total > 1 ? ` · ${position} of ${total}` : ''}
          </span>
          <h2 id={titleId} className="bc-name">{badge.name}</h2>
          <p id={descId} className="bc-desc">
            {badge.description}. Nice work, keep that momentum going!
          </p>

          {total > 1 && (
            <div className="bc-dots" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className={i < position ? 'on' : ''} />
              ))}
            </div>
          )}

          <div className="bc-actions">
            <button ref={primaryRef} type="button" className="btn btn-gradient btn-lg bc-primary" onClick={onNext}>
              {remaining > 0 ? (
                <>Next badge <i className="material-icons">arrow_forward</i></>
              ) : (
                'Awesome!'
              )}
            </button>
            {remaining > 0 ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={onSkipAll}>
                Skip the rest
              </button>
            ) : !onBadgesPage ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={goToBadges}>
                See all my badges
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <style jsx>{`
        .bc-overlay {
          position: fixed;
          inset: 0;
          z-index: calc(var(--z-modal) + 20);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          background: rgba(18, 18, 18, 0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: bcFade 240ms var(--ease-out) both;
        }
        .bc-confetti {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2;
        }

        .bc-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          max-height: calc(100dvh - 32px);
          overflow-y: auto;
          background: var(--bg-white);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-xl);
          text-align: center;
          animation: bcPop 560ms var(--ease-spring) both;
        }

        .bc-close {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 2;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.7);
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .bc-close:hover { background: #fff; color: var(--text-primary); }
        .bc-close:focus-visible { outline: none; box-shadow: var(--ring); }

        .bc-stage {
          position: relative;
          height: 196px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gradient-soft);
          overflow: hidden;
        }
        .bc-rays {
          position: absolute;
          width: 340px;
          height: 340px;
          border-radius: 999px;
          background: repeating-conic-gradient(from 0deg, rgba(127, 25, 160, 0.07) 0deg 10deg, transparent 10deg 24deg);
          animation: bcSpin 24s linear infinite;
        }
        .bc-medal {
          position: relative;
          width: 120px;
          height: 120px;
          padding: 6px;
          border-radius: 999px;
          background: conic-gradient(from 210deg, #C82D8C, #7F19A0, #5019A0, #A267F4, #C82D8C);
          box-shadow: 0 14px 36px color-mix(in srgb, var(--badge-color) 40%, transparent);
          animation: bcMedal 760ms var(--ease-spring) 120ms both;
        }
        .bc-medal-core {
          width: 100%;
          height: 100%;
          border-radius: 999px;
          border: 4px solid #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          background:
            radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.38), transparent 55%),
            var(--badge-color);
        }
        .bc-medal-core .material-icons { font-size: 54px; }

        /* Sticker-style decorations, a nod to revibe.me's playful illustrations. */
        .bc-sticker {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          animation: bcFloat 3.2s var(--ease-out) infinite alternate;
        }
        .bc-sticker .material-icons { font-size: 18px; color: #fff; }
        .bc-sticker-1 {
          top: 28px; left: 22%; width: 34px; height: 34px;
          background: var(--brand-orange);
          border: 3px solid #fff;
          box-shadow: var(--shadow-md);
          transform: rotate(-12deg);
        }
        .bc-sticker-2 {
          bottom: 30px; right: 20%; width: 38px; height: 38px;
          background: var(--brand-magenta);
          border: 3px solid #fff;
          box-shadow: var(--shadow-md);
          transform: rotate(10deg);
          animation-delay: 400ms;
        }
        .bc-sticker-3 {
          top: 40px; right: 24%; width: 14px; height: 14px;
          background: var(--brand-violet-soft);
          animation-delay: 800ms;
        }
        .bc-sticker-4 {
          bottom: 44px; left: 24%; width: 10px; height: 10px;
          background: var(--brand-purple);
          animation-delay: 1200ms;
        }

        .bc-body { padding: var(--space-6) var(--space-7) var(--space-7); }
        .bc-eyebrow {
          font-family: var(--font-heading);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--brand-purple);
        }
        .bc-name {
          margin-top: 6px;
          font-family: var(--font-heading);
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.15;
          color: var(--text-primary);
        }
        .bc-desc {
          margin: 8px auto 0;
          max-width: 32ch;
          font-size: 14.5px;
          line-height: 1.55;
          color: var(--text-muted);
        }

        .bc-dots { display: flex; justify-content: center; gap: 6px; margin-top: var(--space-4); }
        .bc-dots span {
          width: 8px; height: 8px; border-radius: 999px; background: var(--border-strong);
          transition: background var(--transition-base), width var(--transition-base);
        }
        .bc-dots span.on { background: var(--brand-purple); }

        .bc-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          margin-top: var(--space-6);
        }
        .bc-primary { width: 100%; }

        @keyframes bcFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bcPop {
          from { opacity: 0; transform: translateY(16px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bcMedal {
          0% { opacity: 0; transform: scale(0.4) rotate(-30deg); }
          60% { opacity: 1; transform: scale(1.08) rotate(6deg); }
          100% { transform: scale(1) rotate(0); }
        }
        @keyframes bcSpin { to { transform: rotate(360deg); } }
        @keyframes bcFloat { to { translate: 0 -6px; } }

        @media (max-width: 480px) {
          .bc-stage { height: 168px; }
          .bc-medal { width: 104px; height: 104px; }
          .bc-medal-core .material-icons { font-size: 46px; }
          .bc-body { padding: var(--space-5) var(--space-5) var(--space-6); }
          .bc-name { font-size: 23px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bc-rays, .bc-sticker { animation: none; }
        }
      `}</style>
    </div>
  );
}

export function BadgeCelebrationProvider({ children }) {
  // `shown` counts badges already dismissed in this run (for "2 of 3").
  const [state, setState] = useState({ queue: [], shown: 0 });

  // Recompute badges for the user and enqueue any newly earned ones.
  const checkForBadges = useCallback(async (uid) => {
    if (!uid) return;
    const newBadges = await syncEarnedBadges(uid);
    if (newBadges.length > 0) {
      setState((prev) => ({
        ...prev,
        queue: [...prev.queue, ...newBadges.filter((b) => !prev.queue.some((q) => q.id === b.id))],
      }));
    }
  }, []);

  const next = useCallback(() => {
    setState((prev) => {
      const queue = prev.queue.slice(1);
      return { queue, shown: queue.length ? prev.shown + 1 : 0 };
    });
  }, []);

  const skipAll = useCallback(() => setState({ queue: [], shown: 0 }), []);

  const value = useMemo(() => ({ checkForBadges }), [checkForBadges]);
  const current = state.queue[0];

  return (
    <BadgeCelebrationContext.Provider value={value}>
      {children}
      {current && (
        <CelebrationDialog
          badge={current}
          position={state.shown + 1}
          total={state.shown + state.queue.length}
          onNext={next}
          onSkipAll={skipAll}
        />
      )}
    </BadgeCelebrationContext.Provider>
  );
}
