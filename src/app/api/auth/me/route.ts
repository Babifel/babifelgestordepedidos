import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromCookies, verifyToken } from '@/lib/jwt';
import { getMongoDb } from '@/lib/mongodb';
import { UserModel } from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = getTokenFromCookies(cookieHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      const response = NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
      // Limpiar cookie inválida
      response.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0
      });
      return response;
    }

    await getMongoDb();
    const user = await UserModel.findById(payload.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: user._id?.toString() || '',
          email: user.email,
          name: user.name,
          role: user.role
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}