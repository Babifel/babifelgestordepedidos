import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir acceso a páginas públicas y archivos estáticos
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/register") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });

    console.log("Middleware - Pathname:", pathname);
    console.log("Middleware - Token exists:", !!token);
    console.log("Middleware - User role:", token?.role);

    // Si no hay token y está intentando acceder a rutas protegidas
    if (
      !token &&
      (pathname.startsWith("/dashboard") || pathname.startsWith("/pedidos"))
    ) {
      console.log("Redirecting to login - no token");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Si hay token, verificar permisos por rol
    if (token) {
      const userRole = token.role;

      // Vendedoras solo pueden acceder a /pedidos
      if (userRole === "vendedora" && pathname.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/pedidos", request.url));
      }

      // Administradoras solo pueden acceder a /dashboard
      if (userRole === "administradora" && pathname.startsWith("/pedidos")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      // Redirigir desde la raíz según el rol
      if (pathname === "/") {
        if (userRole === "vendedora") {
          return NextResponse.redirect(new URL("/pedidos", request.url));
        } else if (userRole === "administradora") {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      }
    }
  } catch (error) {
    console.error("Middleware error:", error);
    // En caso de error, redirigir al login para rutas protegidas
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/pedidos")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/pedidos/:path*", "/login", "/register"],
};
