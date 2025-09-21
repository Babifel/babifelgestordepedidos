import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTokenFromCookies, decodeTokenPayload, isTokenExpired } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Obtener token de las cookies
  const cookieHeader = request.headers.get('cookie');
  const token = getTokenFromCookies(cookieHeader);
  
  // Rutas públicas (no requieren autenticación)
  const publicRoutes = ["/", "/login", "/register"];

  // Si no hay token, permitir acceso a rutas públicas
  if (!token) {
    if (publicRoutes.includes(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verificar si el token está expirado
  if (isTokenExpired(token)) {
    // Token expirado, eliminar cookie y redirigir a la ruta inicial
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0
    });
    return response;
  }

  // Decodificar el token para obtener el rol
  const payload = decodeTokenPayload(token);
  if (!payload) {
    // Token inválido, eliminar cookie y redirigir a la ruta inicial
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0
    });
    return response;
  }

  // Verificar si el usuario está activo y si la sesión ha expirado (2 días)
  try {
    const { UserModel } = await import('@/models/User');
    const user = await UserModel.findById(payload.userId);
    
    if (!user) {
      // Usuario no encontrado, eliminar cookie
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0
      });
      return response;
    }

    // Verificar si el usuario está activo (solo para vendedoras)
    if (!user.isActive && user.role !== 'administradora') {
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0
      });
      return response;
    }

    // Verificar expiración de sesión (2 días)
    if (await UserModel.isSessionExpired(user._id?.toString() || '')) {
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0
      });
      return response;
    }
  } catch (error) {
    console.error('Error verificando usuario en middleware:', error);
    // En caso de error, permitir continuar pero registrar el error
  }

  const userRole = payload.role;

  // Si está autenticado y trata de acceder a rutas públicas, redirigir según rol
  if (publicRoutes.includes(pathname)) {
    if (userRole === "administradora") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else if (userRole === "vendedora") {
      return NextResponse.redirect(new URL("/pedidos", request.url));
    }
  }

  // Control de acceso basado en roles
  if (pathname.startsWith("/dashboard")) {
    if (userRole !== "administradora") {
      // Vendedoras no pueden acceder al dashboard
      return NextResponse.redirect(new URL("/pedidos", request.url));
    }
  }

  if (pathname.startsWith("/pedidos")) {
    // Tanto administradoras como vendedoras pueden acceder a pedidos
    if (userRole !== "administradora" && userRole !== "vendedora") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

// Configurar las rutas que deben ser procesadas por el middleware
export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * 1. /api (rutas API)
     * 2. /_next (archivos de Next.js)
     * 3. /public (archivos estáticos)
     * 4. /favicon.ico, /robots.txt, etc.
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
