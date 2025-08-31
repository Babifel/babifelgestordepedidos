import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserModel, UserRole } from "@/models/User";
import { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await UserModel.authenticateUser(
            credentials.email as string,
            credentials.password as string
          );

          if (!user) {
            return null;
          }

          return {
            id: user._id?.toString() || "",
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
          };
        } catch (error) {
          console.error("Error en autenticación:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Exportamos las funciones de NextAuth con tipos explícitos para evitar errores de TypeScript
// Exportamos las funciones de NextAuth
// Aseguramos que auth() pueda ser llamado sin parámetros o con un objeto de opciones
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Eliminamos la función getAuth ya que no es necesaria
// La función auth() de NextAuth ya maneja correctamente los casos necesarios