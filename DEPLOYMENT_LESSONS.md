# Deployment Lessons Learned & LLM Token Optimization Guide

This reference document outlines key solutions, architectural decisions, and error-resolutions discovered during the Vercel deployment of the **Revibe Training Website**. It also provides explicit instructions for future LLMs/agents to minimize context-token usage and keep development lightweight.

---

## 🛠️ Key Technical Errors & Solutions

### 1. Firebase Auth: `signInWithRedirect` vs. `signInWithPopup`
* **The Error**: When using redirect authentication under a custom or third-party domain (e.g., `revibe-training-hub.vercel.app`), modern browsers (Chrome, Brave, Safari) block third-party cookies and tracking storage handshakes, causing the authentication redirect to silently fail or drop the user session.
* **The Solution**: Switched Google Authentication to **`signInWithPopup`** in `contexts/AuthContext.js`. This is highly reliable for Vercel/Next.js hosting because it runs inside a secure, self-contained popup that passes the Auth token directly back to the parent window, completely bypassing cross-origin cookie restrictions.

### 2. Cross-Origin-Opener-Policy (COOP) Blocker
* **The Error**: Clicking login throws: `Cross-Origin-Opener-Policy policy would block the window.close()` or `window.closed()`. The authentication popup remains blank and fails to close itself.
* **The Solution**: Set the COOP security header to **`same-origin-allow-popups`** in `next.config.mjs` instead of the restrictive `same-origin`:
  ```javascript
  const nextConfig = {
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Cross-Origin-Opener-Policy',
              value: 'same-origin-allow-popups',
            },
          ],
        },
      ];
    },
  };
  ```

### 3. Missing Firebase `projectId` Environment Variable Fallbacks
* **The Error**: The application built successfully, but would crash during SDK initializations because of an incomplete Firebase config (missing `projectId`, which Firebase requires for firestore and token handshakes).
* **The Solution**: Implemented dynamic configuration fallback logic directly in `lib/firebase.js`. If variables are omitted in `.env.local`, the SDK extracts the project metadata automatically from the `authDomain`:
  ```javascript
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'revibe-training.firebaseapp.com';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || authDomain.split('.')[0];
  ```

### 4. Next.js Build-Time Env Variable Injection
* **The Error**: Syncing variables on Vercel after a build was complete did not enable Supabase uploads on the client side, causing: `Supabase is not configured yet. Please configure Supabase variables in .env.local`.
* **The Solution**: Variables starting with `NEXT_PUBLIC_` are baked into Next.js client-side JS bundles **at build time**, not runtime. Therefore, after any environment variable updates are made in Vercel settings, a **new production rebuild and deploy must be triggered** (`npx vercel --prod --yes`) so they can be injected into the static client bundles.

### 5. Silent CLI/Script Failures in Node
* **The Error**: Custom scripts (like `add-envs.js`) used a promise wrapper around `exec` that always resolved, hiding error streams from the parent CLI and leading to false-positive success logs even when Vercel CLI requested interactive inputs or rejected commands.
* **The Solution**: When automating CLI tools in Node scripts, explicitly parse `stderr` and check command exit codes. Avoid `exec` prompts by passing values directly via flags (e.g., using `--value` and `--force` in Vercel CLI).

---

## 🤖 LLM Instructions for Context & Token Optimization

To preserve the context window and operate at maximum efficiency, future LLM assistants must abide by these strict rules:

### 1. Minimal Communications
* **No Pleasantries**: Skip headers, greetings, transitions, and conversational fluff. Start immediately with the action or the requested tool call.
* **Be Direct**: Explain why changes were made concisely in technical terms inside summaries. Don't write extensive prose unless specifically requested.

### 2. Precise File Modifications
* **Prefer Targeted Edits**: Avoid using `write_to_file` to rewrite large files when making small updates. Always prefer `replace_in_file` with concise, highly targeted `SEARCH/REPLACE` blocks.
* **Consolidate Operations**: Apply multiple independent `SEARCH/REPLACE` blocks in a single tool call instead of multiple sequential file writes.
* **Zero Overhead**: Do not include lines of code in SEARCH blocks that are not relevant to identifying the match context. Keep them as short as possible.

### 3. Silent CLI Script Execution
* **Use Direct Flags**: Always append non-interactive, auto-confirming flags (like `--yes`, `--force`, or passing values through standard inputs/arguments) to prevent the agent from hanging on prompt inputs.
* **Combine Sequential Shell Commands**: Chain independent commands in a single shell command when sequential context is needed (using `;` on Windows PowerShell/CMD, or `&&` on POSIX environments).
* **Kill Hanging Processes**: Periodically kill idle Node servers or processes that exhaust computer resources (e.g. `taskkill /f /im node.exe`).

### 4. Supabase Storage Setup Reference
* Ensure the **`materials`** bucket in Supabase is explicitly configured as **Public** with standard `SELECT` and `INSERT` access policies so the website can upload and query files correctly.
