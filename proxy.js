import { NextResponse } from 'next/server';

// Route protection is handled client-side inside each page via AuthContext.
// This proxy file is included to suppress the deprecated middleware warning.
export function proxy(request) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/viewer/:path*', '/editor/:path*'],
};
