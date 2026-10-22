import Link from 'next/link';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="page-loader" style={{ padding: 24, textAlign: 'center' }}>
      <div className="wordmark" style={{ marginBottom: 8 }}>
        <span className="wordmark-logo">REVIBE</span>
        <span className="wordmark-product">Training</span>
      </div>
      <p className="gradient-text" style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 96, lineHeight: 1, letterSpacing: '-0.04em' }}>
        404
      </p>
      <h1 className="text-h2">This page took a wrong turn</h1>
      <p className="text-muted" style={{ maxWidth: 400 }}>
        The link may be old or the material was removed. Head back to the library to keep learning.
      </p>
      <Link href="/dashboard" className="btn btn-gradient btn-lg" style={{ marginTop: 8 }}>
        <i className="material-icons">auto_stories</i> Back to library
      </Link>
    </main>
  );
}
