# Revibe Training Hub: Design Guide

The training hub should feel like part of **revibe.me**: confident, friendly, clean,
lots of white space, near-black type, and the purple→magenta brand gradient used as
a highlight (not wallpaper). Everything below is implemented in `app/globals.css`
and `components/ui/`. Use those before writing new CSS.

## Brand

| Token | Value | Use |
|---|---|---|
| `--brand-ink` | `#121212` | Primary text, dark buttons, active chips |
| `--brand-purple` | `#7F19A0` | Links, active states, focus ring, icons |
| `--brand-violet` | `#5019A0` | Deep end of the gradient |
| `--brand-magenta` | `#C82D8C` | Accent, "trainer" role, highlights |
| `--brand-orange` | `#FF6400` | Rare: "hot"/new/streak moments only |
| `--brand-lavender` | `#F1ECF9` | Tinted wells, search fields, icon chips |
| `--gradient-hero` | magenta → purple → violet (135°) | Primary CTA, hero panels, thumbnails |
| `--gradient-brand-h` | magenta → purple (90°) | Progress bars, underlines, small accents |

Status colours: `--color-success|warning|danger|info` (+ `-light`). Stars: `--color-star`.

**Type:** Montserrat everywhere (`--font-heading`, `--font-body`). Headings 700–800 with
tight negative tracking (-0.02em to -0.035em). Body 15px/1.55. Use `.eyebrow` for small
uppercase labels. Numbers in stats use `font-variant-numeric: tabular-nums`.

**Icons:** Material Icons **Round** via `<i className="material-icons">name</i>`.

**Shape:** buttons, chips, search fields and badges are **pills** (`--radius-full`), like
revibe.me CTAs. Cards/panels use `--radius-xl` (18px). Modals `--radius-2xl`.

**Elevation:** soft violet-tinted shadows (`--shadow-xs` resting, `--shadow-lg` hover).
Prefer a 1px `--border` plus `--shadow-xs` over heavy shadows.

**Motion:** `--ease-out` for everything; 150–320ms. Lists animate in with `.stagger`.
Hover lifts are 1–2px max. `prefers-reduced-motion` is respected globally.

## Layout

- Page wrapper: `<div className="app-shell"><Navbar title="…" /><main className="page">…</main></div>`
- Page header: `.page-header` > `.page-header-text` (`.eyebrow`, `.page-title`, `.page-subtitle`) + `.page-header-actions`
- Sections: `.section` with `.section-head` (`h2` + actions)
- Max width `--container` (1240px). Phones get a bottom tab bar from `<Navbar>`; `.page` already pads for it.
- Must work at 375px wide. No horizontal scroll. Tables become cards on phones.

## Components (import from `@/components/ui`)

| Need | Use |
|---|---|
| Auth/role gate | `<RequireAuth role="trainer">` (handles loading + redirects) |
| Full-screen loading | `<PageLoader />` |
| Inline spinner | `<Spinner size="sm" />` |
| Loading placeholders | `<Skeleton height={…} />` or `.skeleton` (never a lone spinner for lists/grids) |
| Empty states | `<EmptyState icon title text action />` |
| Confirm before destructive actions | `const confirm = useConfirm(); await confirm({ title, body, confirmLabel, tone: 'danger' })` |
| Feedback after actions | `import toast from 'react-hot-toast'` → `toast.success()`, `toast.error()`, `toast.promise()` |
| User pictures | `<Avatar src name size />` |
| KPI numbers | `<StatTile icon label value unit meta tone />` |
| Dates | `timeAgo(v)`, `formatDate(v)`, `greeting()` |

CSS classes: `.btn` + `.btn-gradient | .btn-dark | .btn-outline | .btn-soft | .btn-ghost | .btn-danger | .btn-danger-solid`,
sizes `.btn-sm | .btn-lg`, `.btn-icon`; `.input`, `.select`, `.textarea`, `.field-label`; `.search-field` (+ `.kbd`);
`.segmented` (tabs/filters, `.active`); `.chip-row` + `.chip`; `.card`, `.card-interactive`, `.panel` (+ `-head`, `-title`, `-body`);
`.stat-tile`; `.badge-*` (`pink|purple|success|warning|neutral|dark|gradient`); `.status-dot` (`.live`); `.avatar`;
`.progress-bar` + `.progress-bar-fill`; `.empty`; `.modal-backdrop.active` > `.modal` (`-header`, `-title`, `-body`, `-footer`).

## Rules

1. **Never use `alert()` or `window.confirm()`.** Use toasts and `useConfirm`.
2. **No inline style soup.** Put styles in the page's CSS file using tokens; inline styles only for dynamic values (widths, colours from data).
3. **Every async view has three states:** skeleton while loading, an empty state, and an error toast/inline message on failure.
4. **Every interactive element** is a real `<button>` or `<Link>`, has a visible `:focus-visible` state, and an `aria-label` when it's icon-only.
5. **Copy:** short, friendly, plain English, sentence case ("Upload material", not "UPLOAD MATERIAL"). Revibe's voice is playful but clear.
6. **Page titles:** pass `title` to `<Navbar>`; it renders `<title>{title} · Revibe Training</title>`.
7. **Next.js 16:** read `node_modules/next/dist/docs/` before using a Next API. Client pages start with `'use client'`; anything using `useSearchParams` sits in `<Suspense>`.
8. **Data access lives in `lib/`.** Pages/components never import `firebase/*` directly.

## Local preview (no keys, no sign-in)

`npm run dev:preview` starts the dev server with Firebase and Supabase swapped for
in-memory stand-ins (`demo/`), sample decks and sample people. A floating pill
switches between Trainer and Trainee and resets the data. It never affects
`npm run build` or production.
