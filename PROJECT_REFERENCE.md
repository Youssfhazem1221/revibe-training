# REVIBE TRAINING HUB — Master Reference Document
> **For LLM agents:** Read this document in full before making any changes to the Revibe Training Hub codebase. All architectural decisions, design rules, known gotchas, and infrastructure details are documented here. Treat this as ground truth.

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Project Name** | Revibe Training Hub |
| **Company** | REVIBE — Refurbished electronics retailer |
| **Markets** | UAE, KSA, South Africa, Mexico, Philippines |
| **Brand Voice** | Playful, energetic, modern, approachable. **NOT corporate.** |
| **Tagline** | "Like new, but waaaay cheaper." |
| **Project Purpose** | Internal employee training portal — upload, view, and annotate PDF training materials |
| **Project Directory** | `c:\Users\Youssf\Documents\Revibe Training Website` |

---

## 2. Technology Stack

### Core Framework
- **Next.js 16.2.10** (App Router, Turbopack dev server)
- **React 19.2.4**
- **Tailwind CSS v4** (utility-first CSS framework, configured via PostCSS)
- **Custom CSS** (REVIBE design system in `globals.css`—colors, typography, shared components)

### Backend & Database (Serverless)
| Service | Provider | Purpose |
|---|---|---|
| **Authentication** | Firebase Auth | Google Sign-In (popup-based, upgraded to redirect) |
| **Database** | Firebase Firestore | PDF metadata, user roles, annotations |
| **File Storage** | Supabase Storage | PDF binary cloud storage (Firebase Storage was unavailable on free tier) |

### Key Libraries
| Library | Version | Purpose |
|---|---|---|
| `firebase` | ^12.16.0 | Auth + Firestore |
| `@supabase/supabase-js` | ^2.110.2 | Cloud PDF storage |
| `pdfjs-dist` | **4.4.168 (pinned)** | PDF rendering in browser |
| `fabric` | ^7.4.0 | Canvas drawing layer in PDF Editor |
| `pdf-lib` | ^1.17.1 | (Installed, reserved for V2 PDF flattening) |
| `react-hot-toast` | ^2.6.0 | (Installed, available for toast notifications) |
| `tailwindcss` | ^4 | Utility-first CSS framework (via PostCSS) |

> [!CAUTION]
> `pdfjs-dist` MUST stay at version `4.4.168`. The latest `6.x` version breaks CDN worker loading because the build artifact extension changed and CDNs don't carry it. Do not upgrade without testing.

---

## 3. Design System

### Color Palette (CSS Variables in `app/globals.css`)
```css
--accent-pink: #FF2E63;
--accent-pink-deep: #E01E4F;
--accent-purple: #7C3AED;
--bg-white: #FFFFFF;
--bg-soft: #FAF5FF;
--bg-lavender: #F5F0FF;
--text-primary: #1A1A1A;
--text-muted: #2D2D2D;
--gradient-hero: linear-gradient(135deg, #FF2E63 0%, #7C3AED 100%);
```

### Typography
- **Headings / Display:** `Poppins` (loaded via `next/font/google`)
- **Body / UI:** `Inter` (loaded via `next/font/google`)
- **Data / Monospace:** `JetBrains Mono` (loaded via `next/font/google`)

### Aesthetic Rules
- Use glassmorphism on floating elements (`backdrop-filter: blur()`)
- Buttons and inputs must have hover/focus states with subtle `transform: scale()` and glow `box-shadow`
- Borders are highly rounded (`border-radius: 12px` – `24px`)
- All animations use CSS custom properties for timing (defined in `globals.css`)
- The brand wordmark is always **REVIBE** — uppercase, bold, tight letter-spacing

### Icon Library
- Google Material Icons via CDN in `app/layout.js`:
  ```html
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
  ```

---

## 4. File Structure

```
c:\Users\Youssf\Documents\Revibe Training Website\
├── app/
│   ├── api/
│   │   ├── upload/route.js        # Local disk upload API (fallback - not used in prod)
│   │   └── delete/route.js        # Local disk delete API (fallback - not used in prod)
│   ├── dashboard/
│   │   ├── page.js                # Main training material grid + search
│   │   └── dashboard.css          # Dashboard styles
│   ├── editor/
│   │   ├── page.js                # Editor page wrapper (Trainer-only)
│   │   └── editor.css             # Editor styles
│   ├── viewer/
│   │   ├── page.js                # Viewer page wrapper
│   │   └── viewer.css             # Viewer styles
│   ├── globals.css                # ⭐ MASTER DESIGN SYSTEM — all CSS variables, shared components
│   ├── layout.js                  # Root layout — fonts, metadata, AuthProvider wrapper
│   ├── login.css                  # Login page styles
│   └── page.js                    # Login page (Google Sign-In button)
├── components/
│   ├── Navbar.js                  # Shared top navigation bar
│   ├── PDFViewer.js               # Full-featured PDF viewer with Ctrl+F search
│   ├── PDFEditor.js               # Experimental annotation editor (Fabric.js)
│   └── UploadZone.js              # Drag-and-drop PDF upload component
├── contexts/
│   └── AuthContext.js             # ⭐ Auth state manager — role detection, sign in/out
├── lib/
│   ├── firebase.js                # Firebase app initialization
│   ├── supabase.js                # Supabase client initialization
│   └── materials.js               # All Firestore + Supabase CRUD operations
├── middleware.js                  # Minimal Next.js route middleware (auth done client-side)
├── .env.local                     # 🔑 Firebase + Supabase credentials (never commit)
└── package.json
```

---

## 5. Authentication & Role System

### How it Works
1. **Login page** (`app/page.js`) calls `signInWithRedirect(auth, GoogleAuthProvider)` — this causes a full-page redirect to Google's login, then back.
2. `AuthContext.js` listens with `onAuthStateChanged`. On return:
   - It determines `role` **from email first** (no network dependency).
   - Then it attempts to sync the role with Firestore (wrapped in `try/catch` to not block if offline).
3. `AuthContext` exposes: `{ user, role, loading, isTrainer, signInWithGoogle, signOut }`.

### Admin / Trainer Detection
```js
const ADMIN_EMAIL = 'youssf.rehem@revibe.me';
// In AuthContext.js — this email is ALWAYS granted the 'trainer' role
if (firebaseUser.email.toLowerCase() === ADMIN_EMAIL) {
  currentRole = 'trainer';
}
```

> [!IMPORTANT]
> The admin check is **email-based and hardcoded** in `AuthContext.js`. This is intentional for V1. Do not remove this check. Other users are assigned `trainee` by default and can be promoted to `trainer` in Firestore.

### Role Gates
- **Trainer sees:** Hero stats section, UploadZone, Edit button, Delete button on material cards, access to `/editor` route.
- **Trainee sees:** Material grid, search bar, View button on material cards. Cannot access `/editor`.

### Firestore: `users` Collection Schema
```json
{
  "uid": "firebaseUID",
  "email": "user@example.com",
  "displayName": "First Last",
  "photoURL": "https://...",
  "role": "trainee | trainer",
  "createdAt": "ISO string",
  "lastLogin": "ISO string"
}
```

---

## 6. Database Schemas

### Firestore: `materials` Collection
```json
{
  "id": "unique-file-id (generated on upload)",
  "name": "Filename without .pdf extension",
  "fileName": "original-file.pdf",
  "category": "General | Onboarding | Technical | Sales | ...",
  "fileSize": 1234567,
  "pageCount": 20,
  "storagePath": "supabase-bucket-relative-file-path",
  "downloadURL": "https://jgplmiqtewwpkqkrgazt.supabase.co/storage/v1/object/public/materials/...",
  "thumbnailURL": null,
  "textContent": [{ "page": 1, "text": "extracted page text..." }, ...],
  "uploadedBy": "youssf.rehem@revibe.me",
  "uploadedAt": "Firestore serverTimestamp"
}
```

> [!NOTE]
> `textContent` is extracted at upload time in `UploadZone.js` using `pdfjs-dist`. This powers the full-text search in the Viewer (Ctrl+F) and the Dashboard search bar. It indexes up to 50 pages per document.

### Firestore: `annotations` Collection
```json
{
  "id": "materialId_page_pageNumber",
  "materialId": "the-material-id",
  "pageNumber": 3,
  "fabricJSON": { "...Fabric.js canvas JSON state..." },
  "updatedAt": "Firestore serverTimestamp"
}
```

---

## 7. Infrastructure — Supabase Storage

- **Project ID:** `jgplmiqtewwpkqkrgazt`
- **Project URL:** `https://jgplmiqtewwpkqkrgazt.supabase.co`
- **Bucket Name:** `materials` (Public bucket)
- **RLS Policies:** Public INSERT + SELECT enabled (allows anonymous uploads and reads)
- **Files are served** at: `https://jgplmiqtewwpkqkrgazt.supabase.co/storage/v1/object/public/materials/{storagePath}`

---

## 8. Infrastructure — Firebase

- **Project Name:** `revibe-training`
- **Project ID:** `revibe-training`
- **Sender ID:** `515892825575`
- **App ID:** `1:515892825575:web:36a3f1dad6808023e7c142`
- **Services enabled:** Authentication (Google), Firestore (test mode), Analytics
- **Authorized domains:** `localhost`, (add production domain when deploying)

---

## 9. PDF.js Worker — Critical Gotcha

PDF.js requires a web worker script. We load it from a CDN:

```js
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
```

> [!WARNING]
> **The extension must be `.mjs`, NOT `.js`.** PDF.js v4+ ships only as ES Modules. CDNs serving v4 use the `.mjs` extension. Using `.js` results in a 404.
> 
> **The version is pinned at `4.4.168` in package.json.** Do not upgrade without verifying the CDN URL works for the new version.

This CDN path is set in **three files** — always update all three together:
1. `components/PDFViewer.js` (top-level module scope)
2. `components/PDFEditor.js` (top-level module scope)
3. `components/UploadZone.js` (inside the dynamic import handler)

---

## 10. High-DPI / Retina Rendering

Both `PDFViewer.js` and `PDFEditor.js` implement DPR-aware rendering:

```js
const dpr = window.devicePixelRatio || 1;
const viewport = page.getViewport({ scale: scale * dpr });
canvas.width = viewport.width;
canvas.height = viewport.height;
canvas.style.width = `${viewport.width / dpr}px`;
canvas.style.height = `${viewport.height / dpr}px`;
```

This makes text sharp on Retina/HiDPI screens. Do not simplify this — it will make PDFs look blurry.

---

## 11. Feature Status

| Feature | Status | Notes |
|---|---|---|
| Google Sign-In | ✅ Working | Uses `signInWithRedirect` (not popup — popup blocked by browsers) |
| Role-based access (Trainer/Trainee) | ✅ Working | Email-based + Firestore sync |
| PDF upload to cloud | ✅ Working | Via Supabase Storage |
| PDF listing on Dashboard | ✅ Working | Ordered by `uploadedAt` desc |
| PDF Viewer | ✅ Working | PDF.js, HiDPI, zoom, page nav, sidebar |
| Viewer loading spinner | ✅ Working | Shown during page renders |
| Ctrl+F in-app search | ✅ Working | Navigates between matching pages, shows "X of Y" |
| Dashboard keyword search | ✅ Working | Searches name + embedded text content |
| Category filter pills | ✅ Working | Dynamically generated from uploaded materials |
| Delete material | ✅ Working | Deletes from Firestore + Supabase |
| Experimental PDF Editor | ✅ Working | Fabric.js overlay, draw/text/shape tools |
| Annotation saving | ✅ Working | Saves Fabric.js JSON to Firestore per page |
| Annotation loading | ✅ Working | Restores annotations when reopening editor |
| PDF page count detection | ✅ Working | Extracted at upload time via pdfjs-dist |
| PDF text indexing (search) | ✅ Working | Extracted at upload time, up to 50 pages |
| Thumbnail previews | ⬜ Not Implemented | `thumbnailURL` field exists, generation not implemented |
| Email/password login | ⬜ Not Implemented | Only Google Sign-In is active |
| Multi-trainer user management | ⬜ Not Implemented | Can be done by manually editing Firestore `users` collection |
| Annotation "burn" to PDF | ⬜ V2 | `pdf-lib` is installed for this purpose |

---

## 12. Known Issues & Decisions

1. **`signInWithPopup` is disabled.** Browsers (especially with privacy shields/ad blockers) block the OAuth popup. We use `signInWithRedirect` instead, which does a full-page navigation to Google then back.

2. **Firebase Storage is NOT used.** The free Firebase plan ("Spark") requires a credit card to enable Storage due to account-level bucket limits. We use **Supabase Storage** instead, which is free and has no credit card requirement.

3. **Local upload API routes exist** (`app/api/upload/route.js` and `app/api/delete/route.js`) but are **not actively used** — they were a temporary fallback before Supabase was integrated. They can be deleted in a future cleanup.

4. **The middleware is minimal** — route protection is done client-side inside each page via `AuthContext`. Server-side Firebase auth protection would require custom JWT cookies/claims, which is out of V1 scope.

5. **Firestore is in "test mode"** — all reads/writes are open. Before production deployment, add proper security rules.

6. **Search uses pre-extracted text** — the search does NOT parse a live PDF on demand. Text is extracted at upload time and stored in `textContent` in Firestore. If a PDF is very long (>50 pages), only the first 50 pages are indexed.

---

## 13. Environment Variables (`.env.local`)

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyAKJGyvxuGvy2LyI9R71sJcSV1nq6FA8_I"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="revibe-training.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="revibe-training"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="revibe-training.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="515892825575"
NEXT_PUBLIC_FIREBASE_APP_ID="1:515892825575:web:36a3f1dad6808023e7c142"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-2RKTP6HZLM"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://jgplmiqtewwpkqkrgazt.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_Y778IRxTQGez7acXR6kWlQ_5AYhefGe"
```

---

## 14. Running the Project

```bash
# Install dependencies (first time)
npm install

# Start development server
npm run dev

# Build for production (verify no compile errors)
npm run build
```

- Dev server runs at: **http://localhost:3000**
- The dev server is managed as a background task. Do not manually kill port 3000 unless intentionally restarting.

---

## 15. V2 Planned Features

1. **Annotation flattening** — Use `pdf-lib` to permanently bake Fabric.js annotations into the PDF bytes and upload a new version to Supabase.
2. **Email/Password login** — Add a secondary login method alongside Google.
3. **User management UI** — Allow Trainer to promote/demote other users from the dashboard.
4. **Firestore security rules** — Restrict reads/writes by user role.
5. **Production deployment** — Deploy on Vercel or a VPS; add production domain to Firebase authorized domains.
6. **Thumbnail generation** — Render page 1 of each PDF to a canvas at upload time and save the base64 image as `thumbnailURL`.
7. **Notification system** — Use `react-hot-toast` (already installed) for success/error toasts on upload, delete, annotation save.
