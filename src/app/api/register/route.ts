import { NextRequest, NextResponse } from "next/server";
import { UserModel, UserRole } from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json();

    // Validaciones básicas
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    if (!["vendedora", "administradora"].includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Crear usuario
    const user = await UserModel.createUser({
      email,
      password,
      name,
      role: role as UserRole,
    });

    return NextResponse.json(
      { message: "Usuario creado exitosamente", user },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error al registrar usuario:", error);

    if (error instanceof Error && error.message === "El usuario ya existe") {
      return NextResponse.json(
        { error: "El usuario ya existe" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
