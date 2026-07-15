# Revibe Training Hub — Sprint Plan

## Sprint 0: Foundation & Security (Week 1)

**Goal:** Production-safe backend before building new features.

| Task | Files | Details |
|---|---|---|
| Firestore security rules | Firebase Console → Firestore → Rules | Restrict reads/writes by auth + role. `/users` write: only own doc or trainer. `/materials` write: trainer only. `/annotations` write: authenticated only. `/progress` write: own doc only |
| Supabase RLS policies | Supabase Dashboard → Storage → Policies | Bucket `materials`: public SELECT, authenticated INSERT/DELETE |
| `lib/users.js` — user CRUD | `lib/users.js` | `getAllUsers()`, `updateUserRole(uid, newRole)` — Firestore queries on `users` collection ordered by `lastLogin` |
| Firebase authorized domains | Firebase Console → Auth → Settings | Add Vercel domain + localhost |

---

## Sprint 1: User Management UI (Week 2)

**Goal:** Trainer can view, promote, and demote users from within the app.

### Data Layer

| File | What |
|---|---|
| `lib/users.js` | `getAllUsers()` — `query(collection(db, 'users'), orderBy('lastLogin', 'desc'))`. `setUserRole(uid, role)` — `setDoc(userRef, { role }, { merge: true })` |

### UI Components

| Component | What |
|---|---|
| `app/dashboard/users/users.css` | Styles for the user management panel |
| `app/dashboard/users/page.js` | **New route** — `/dashboard/users`. Trainer-only. Table of users: avatar, name, email, role badge, last login. Promote/Demote buttons |
| Update `Navbar.js` | Add "Users" link visible only to trainers |

### UX Flow

```
Dashboard → Navbar "Users" → /dashboard/users
  ┌──────────────────────────────────────────┐
  │  Users (4)                        Search │
  │  ┌──────────────────────────────────────┐│
  │  │  Youssf Rehem  trainer  Last: 2m ago ││
  │  │  youssf@revibe.me                [—] ││
  │  ├──────────────────────────────────────┤│
  │  │  Ahmed Ali     trainee  Last: 1h ago ││
  │  │  ahmed@revibe.me              [+ →] ││
  │  ├──────────────────────────────────────┤│
  │  │  Sara Khan     trainee  Last: 3h ago ││
  │  │  sara@revibe.me               [+ →] ││
  │  └──────────────────────────────────────┘│
  └──────────────────────────────────────────┘
```

---

## Sprint 2: Progress Tracking (Weeks 3-4)

**Goal:** Track per-page view completion for each trainee on each material.

### Data Model — Firestore Collection `progress`

```
{
  id: "uid_materialId",
  uid: "firebaseUID",
  materialId: "material-id",
  materialName: "Onboarding Guide",
  totalPages: 20,
  viewedPages: [1, 2, 3, 5, 7],
  completed: false,       // true when viewedPages.length >= totalPages
  lastPage: 7,
  lastViewedAt: "ISO string",
  startedAt: "ISO string"
}
```

### Data Layer

| File | What |
|---|---|
| `lib/progress.js` | `recordPageView(uid, materialId, pageNum, totalPages)` — upserts progress doc. `getUserProgress(uid)` — all materials for a user. `getMaterialProgress(materialId)` — all users for a material. `getAllProgress()` — trainer overview |

### PDFViewer Changes

| File | What |
|---|---|
| `components/PDFViewer.js` | On each `pageNum` change, call `recordPageView(user.uid, materialId, pageNum, numPages)`. Debounced (2s) to avoid Firestore spam. Add `useAuth` + `import { recordPageView } from '@/lib/progress'` |

### UI Components

| Component | What |
|---|---|
| `components/ProgressBar.js` | Small horizontal bar: `X / Y pages viewed`. Used inside material cards |
| Update `app/dashboard/page.js` | Show `ProgressBar` on each material card for trainers (all users) and for the current user |
| Update `app/dashboard/dashboard.css` | Styles for progress bar |

### Trainer Dashboard Enhancements

| Section | What |
|---|---|
| Hero stats | Add "Active Trainees", "Materials Completed" stats |
| Per-material view | Click a material → see which trainees have viewed which pages |

---

## Sprint 3: Annotation Flattening for PPTX (Weeks 5-6)

**Goal:** Users can permanently "burn" Fabric.js annotations into the PPTX file and download/update the annotated version.

### Architecture

```
PDFEditor.js → "Flatten & Save" button →
  1. Render current page + annotations to offscreen canvas
  2. Convert canvas to image
  3. Insert image as new slide in PPTX (using pptx-browser or pptxgenjs)
  4. Upload new PPTX to Supabase (versioned filename)
  5. Update Firestore material doc with new downloadURL
```

### Challenges & Decisions

| Issue | Decision |
|---|---|
| PPTX format is complex | Use `pptxgenjs` (new dependency) to build a new PPTX with annotated slides as images |
| Each page annotation = one slide image | Render PDF page + Fabric overlay → canvas → PNG → insert into new PPTX |
| Large file sizes | Compress PNGs to JPEG 0.8 quality |
| Versioning | Store `version` field in Firestore material doc. Old versions remain in Supabase with `_v1`, `_v2` suffix |

### Dependencies to Add

```
npm install pptxgenjs
```

### Files to Create/Modify

| File | What |
|---|---|
| `lib/flatten.js` | `flattenAnnotations(materialId, pdfDoc, annotations)` — renders each annotated page to canvas → builds PPTX via pptxgenjs → uploads to Supabase |
| `components/PDFEditor.js` | Add "Flatten & Save as PPTX" button in toolbar (trainer-only). Shows progress modal during flattening |
| `app/editor/editor.css` | Styles for flattening progress modal |

### User Flow

```
Trainer opens PDF Editor
  → Annotates pages
  → Clicks "Flatten & Save as PPTX"
  → Progress modal: "Rendering page 3 of 12..."
  → Success: "New PPTX saved! View in Viewer"
  → Material card now shows both original PDF + flattened PPTX
```

---

## Sprint 4: Real-Time Collaboration (Weeks 7-8)

**Goal:** Multiple trainers can annotate the same page simultaneously with live sync.

### Architecture

```
Firestore onSnapshot(annotations doc) →
  fabricCanvas.loadFromJSON(remoteJSON) →
  Detect local vs remote changes → merge or notify

Conflict resolution:
  - Last-write-wins per annotation object
  - Fabric.js objects have unique IDs → compare by object ID
  - Show "Another trainer is editing this page" banner
```

### Data Model Changes

No changes needed — the existing `annotations` collection with `materialId_page_pageNumber` doc ID already supports this. Each doc stores the full Fabric.js state for that page.

### Implementation

| File | What |
|---|---|
| `components/PDFEditor.js` | Add `onSnapshot` listener for the current page's annotation doc. On remote change: `fabricCanvas.loadFromJSON(remoteJSON)`. Debounce local saves to 2s. Track `lastModifiedBy` field (uid) |
| `lib/materials.js` | Add `subscribeAnnotation(materialId, pageNumber, callback)` — returns unsubscribe function. Add `lastModifiedBy` to `saveAnnotation` |
| `components/PresenceBadge.js` | **New component** — shows avatars of trainers currently viewing/editing the same page |

### Conflict Resolution Strategy

```
onSnapshot fires with new data →
  if (localUnsavedChanges && remoteData.updatedAt > localLastSync) {
    // Merge: keep local objects that haven't been remotely deleted
    // Add remote objects that don't exist locally
    fabricCanvas.loadFromJSON(mergedJSON);
    showToast("Merged changes from another trainer");
  } else {
    // No local changes — safe to overwrite
    fabricCanvas.loadFromJSON(remoteJSON);
  }
```

### Presence Tracking

| Mechanism | How |
|---|---|
| Firestore `connected_users` collection | Each trainer writes to `connected_users/{uid}` with `{ materialId, pageNumber, lastSeen }` on page load. Deletes doc on unload. `onSnapshot` reads all docs in the same material/page |

---

## Future Sprints (V3+)

| Feature | Notes |
|---|---|
| Dark mode | CSS variables ready. Toggle in Navbar. Persist to localStorage |
| Mobile PWA | Next.js `next-pwa` or native service worker. Offline PDF cache |
| Email/password login | Secondary auth UI. Firebase already supports it |
| Course builder | Group materials, set order, prerequisites |
| Quiz engine | MCQ tied to materials. Auto-grade. Trainer dashboard |
