import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

// Local preview mode (`npm run dev:preview`): swap Firebase and Supabase for
// in-memory stand-ins in demo/ so the whole site runs with sample data and no
// sign-in. Only ever applies to the dev server, never to `next build`.
const previewAliases = {
  'firebase/app': './demo/firebase-app.js',
  'firebase/auth': './demo/firebase-auth.js',
  'firebase/firestore': './demo/firebase-firestore.js',
  '@supabase/supabase-js': './demo/supabase-js.js',
};

/** @type {(phase: string) => import('next').NextConfig} */
export default function nextConfig(phase) {
  const preview = phase === PHASE_DEVELOPMENT_SERVER && process.env.NEXT_PUBLIC_PREVIEW_MODE === '1';

  return {
    ...(preview ? { turbopack: { resolveAlias: previewAliases } } : {}),
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
}
