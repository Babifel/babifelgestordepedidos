import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export type UserRole = "vendedora" | "administradora";

export interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserWithoutPassword {
  _id?: ObjectId;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export const UserModel = {
  async createUser(
    userData: Omit<User, "_id" | "createdAt" | "updatedAt">
  ): Promise<UserWithoutPassword> {
    const db = await getMongoDb();

    // Verificar si el usuario ya existe
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new Error("El usuario ya existe");
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Crear nuevo usuario
    const now = new Date();
    const newUser: User = {
      ...userData,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("users").insertOne(newUser);

    // Devolver usuario sin contraseña
    const userWithoutPassword = Object.fromEntries(
      Object.entries(newUser).filter(([key]) => key !== "password")
    ) as Omit<User, "password">;

    return {
      ...userWithoutPassword,
      _id: result.insertedId,
    };
  },

  async findByEmail(email: string): Promise<User | null> {
    const db = await getMongoDb();
    return db.collection("users").findOne<User>({ email });
  },

  async findById(userId: string): Promise<UserWithoutPassword | null> {
    const db = await getMongoDb();
    const user = await db.collection("users").findOne<User>({ _id: new ObjectId(userId) });
    
    if (!user) {
      return null;
    }

    // Devolver usuario sin contraseña
    const userWithoutPassword = Object.fromEntries(
      Object.entries(user).filter(([key]) => key !== "password")
    ) as UserWithoutPassword;
    
    return userWithoutPassword;
  },

  async authenticateUser(
    email: string,
    password: string
  ): Promise<User | null> {
    const user = await this.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  },

  async obtenerTodosLosUsuarios(): Promise<UserWithoutPassword[]> {
    const db = await getMongoDb();
    const users = (await db.collection("users").find({}).toArray()) as User[];

    // Eliminar contraseñas antes de devolver
    return users.map((user) => {
      // Desestructurar omitiendo la propiedad password
      const userWithoutPassword = Object.fromEntries(
        Object.entries(user).filter(([key]) => key !== "password")
      ) as UserWithoutPassword;
      return userWithoutPassword;
    });
  },

  async eliminarUsuario(userId: string): Promise<boolean> {
    const db = await getMongoDb();
    const result = await db
      .collection("users")
      .deleteOne({ _id: new ObjectId(userId) });
    return result.deletedCount === 1;
  },
};
