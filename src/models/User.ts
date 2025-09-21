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
  isActive?: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserWithoutPassword {
  _id?: ObjectId;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  lastLoginAt?: Date;
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
      isActive: true,
      lastLoginAt: undefined,
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

    // Verificar si el usuario está activo
    if (user.isActive === false) {
      throw new Error("Usuario desactivado");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    // Actualizar último login
    await this.updateLastLogin(user._id!.toString());

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

  async updateUserStatus(userId: string, isActive: boolean): Promise<boolean> {
    const db = await getMongoDb();
    const result = await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            isActive,
            updatedAt: new Date()
          }
        }
      );
    return result.modifiedCount === 1;
  },

  async updateLastLogin(userId: string): Promise<boolean> {
    const db = await getMongoDb();
    const result = await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            lastLoginAt: new Date(),
            updatedAt: new Date()
          }
        }
      );
    return result.modifiedCount === 1;
  },

  async isSessionExpired(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user || !user.lastLoginAt) {
      return true;
    }

    const now = new Date();
    const lastLogin = new Date(user.lastLoginAt);
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000; // 2 días en milisegundos
    
    return (now.getTime() - lastLogin.getTime()) > twoDaysInMs;
  },
};
