import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas (no requieren autenticación)
  const publicRoutes = ['/login', '/register'];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Verificar autenticación usando JWT directamente (compatible con Edge)
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  // Si no hay token, redirigir a login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Control de acceso basado en roles
  const userRole = token.role as string;

  // Rutas exclusivas para administradoras
  if (pathname.startsWith('/dashboard') && userRole !== 'administradora') {
    return NextResponse.redirect(new URL('/pedidos', request.url));
  }

  // Rutas para vendedoras (todas las vendedoras pueden acceder a /pedidos)
  if (pathname.startsWith('/pedidos')) {
    return NextResponse.next();
  }

  // Ruta raíz - redirigir según rol
  if (pathname === '/') {
    if (userRole === 'administradora') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/pedidos', request.url));
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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};