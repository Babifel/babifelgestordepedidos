import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";

export type UserRole = "vendedora" | "administradora";

export interface User {
  _id?: ObjectId;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserWithoutPassword = Omit<User, "password">;

export class UserModel {
  private static async getCollection() {
    const client = await clientPromise;
    const db = client.db("yeny-crm");
    return db.collection<User>("users");
  }

  static async createUser(
    userData: Omit<User, "_id" | "createdAt" | "updatedAt">
  ): Promise<UserWithoutPassword> {
    const collection = await this.getCollection();

    // Verificar si el usuario ya existe
    const existingUser = await collection.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error("El usuario ya existe");
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const newUser: Omit<User, "_id"> = {
      ...userData,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newUser);
    const createdUser = await collection.findOne({ _id: result.insertedId });

    if (!createdUser) {
      throw new Error("Error al crear el usuario");
    }

    // Retornar usuario sin contraseña
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = createdUser;
    return userWithoutPassword;
  }

  static async findUserByEmail(email: string): Promise<User | null> {
    const collection = await this.getCollection();
    return await collection.findOne({ email });
  }

  static async validatePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async authenticateUser(
    email: string,
    password: string
  ): Promise<UserWithoutPassword | null> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      return null;
    }

    const isValidPassword = await this.validatePassword(
      password,
      user.password
    );
    if (!isValidPassword) {
      return null;
    }

    // Retornar usuario sin contraseña
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async obtenerTodosLosUsuarios(): Promise<UserWithoutPassword[]> {
    const collection = await this.getCollection();
    const usuarios = await collection.find({}).toArray();

    return usuarios.map((user) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  static async findByEmail(email: string): Promise<UserWithoutPassword | null> {
    const collection = await this.getCollection();
    const user = await collection.findOne({ email });

    if (!user) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async eliminarUsuario(userId: string): Promise<boolean> {
    const collection = await this.getCollection();

    try {
      const objectId = new ObjectId(userId);
      const result = await collection.deleteOne({ _id: objectId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      return false;
    }
  }
}
