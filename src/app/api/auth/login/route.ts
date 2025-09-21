import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getMongoDb } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import { signToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    await getMongoDb();
    const user = await UserModel.findByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Verificar si el usuario está activo (solo para vendedoras)
    if (!user.isActive && user.role !== 'administradora') {
      return NextResponse.json(
        { error: 'Tu cuenta ha sido desactivada. Contacta al administrador.' },
        { status: 403 }
      );
    }

    // Actualizar último login
    await UserModel.updateLastLogin(user._id?.toString() || '');

    const token = signToken({
      userId: user._id?.toString() || '',
      email: user.email,
      role: user.role,
      name: user.name
    });

    const response = NextResponse.json(
      {
        message: 'Login exitoso',
        user: {
          id: user._id?.toString() || '',
          email: user.email,
          name: user.name,
          role: user.role
        }
      },
      { status: 200 }
    );

    // Establecer cookie con el token (2 días)
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 2 // 2 días
    });

    return response;
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}