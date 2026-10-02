'use client';

import { Toaster } from 'react-hot-toast';

// Brand-styled toasts. Use `import toast from 'react-hot-toast'` anywhere:
// toast.success('Saved'), toast.error('Could not save'), toast.promise(p, {...}).
export default function AppToaster() {
  return (
    <Toaster
      // Top-centre, below the nav: bottom edges belong to the phone tab bar and
      // the viewer's control bar.
      position="top-center"
      gutter={10}
      containerStyle={{ top: 'calc(var(--nav-height) + 10px)' }}
      toastOptions={{
        duration: 3500,
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          fontWeight: 600,
          color: '#fff',
          background: '#121212',
          borderRadius: '999px',
          padding: '10px 18px',
          boxShadow: '0 12px 32px rgba(18, 18, 18, 0.22)',
          maxWidth: '92vw',
        },
        success: { iconTheme: { primary: '#3DDC84', secondary: '#121212' } },
        error: { iconTheme: { primary: '#FF6B6B', secondary: '#121212' }, duration: 5000 },
      }}
    />
  );
}
