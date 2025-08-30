import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserModel, UserRole } from "@/models/User";

// GET - Obtener todos los usuarios
export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo administradoras pueden ver la lista de usuarios
    if (session.user.role !== "administradora") {
      return NextResponse.json(
        { error: "No tienes permisos para acceder a esta información" },
        { status: 403 }
      );
    }

    const usuarios = await UserModel.obtenerTodosLosUsuarios();

    return NextResponse.json({
      success: true,
      usuarios,
    });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo usuario
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo administradoras pueden crear usuarios
    if (session.user.role !== "administradora") {
      return NextResponse.json(
        { error: "No tienes permisos para crear usuarios" },
        { status: 403 }
      );
    }

    const { nombre, email, password, role } = await request.json();

    // Validar datos requeridos
    if (!nombre || !email || !password || !role) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    // Validar rol
    if (role !== "vendedora" && role !== "administradora") {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    // Verificar si el email ya existe
    const usuarioExistente = await UserModel.findByEmail(email);
    if (usuarioExistente) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 400 }
      );
    }

    const nuevoUsuario = await UserModel.createUser({
      name: nombre,
      email,
      password,
      role: role as UserRole,
    });

    return NextResponse.json({
      success: true,
      message: "Usuario creado exitosamente",
      usuario: nuevoUsuario,
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar usuario
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo administradoras pueden eliminar usuarios
    if (session.user.role !== "administradora") {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar usuarios" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { error: "ID de usuario requerido" },
        { status: 400 }
      );
    }

    // No permitir que se elimine a sí mismo
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "No puedes eliminarte a ti mismo" },
        { status: 400 }
      );
    }

    const resultado = await UserModel.eliminarUsuario(userId);

    if (!resultado) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Usuario eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
