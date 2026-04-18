import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/accept-invite",
  "/client",
  "/client/access",
  "/client/activate",
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("session")?.value;
  const clientPortal = request.cookies.get("client_portal")?.value;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if (PUBLIC_PATHS.has(pathname)) {
    if (session && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname.startsWith("/client/")) {
    if (pathname === "/client/activate") {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    if (clientPortal && clientPortal.length > 10) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    return NextResponse.redirect(new URL("/client/access?error=session", request.url));
  }

  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
