import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
    const headers = new Headers(req.headers);

    // Handle Facebook external hit crawler by removing Range header
    if (
        req.headers.get('User-Agent')?.includes('facebookexternalhit') &&
        req.headers.has('Range')
    ) {
        headers.delete('Range');
    }

    return NextResponse.next({
        request: { headers }
    });
}

// Configure which paths the middleware should run on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)'
    ]
};
