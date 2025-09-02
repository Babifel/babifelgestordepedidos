import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error("Error al verificar token:", error);
    if (error instanceof jwt.TokenExpiredError) {
      console.error("Token expirado");
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error("Firma no válida o token malformado");
    }
    return null;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

export function getTokenFromCookies(
  cookieHeader: string | null
): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "auth-token") {
      return value;
    }
  }
  return null;
}

// Función para verificar si un token está expirado
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;

    const payload = parts[1];
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );

    if (!decoded.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    console.error("Error al verificar expiración del token:", error);
    return true;
  }
}

// Función para decodificar el token sin verificar (para middleware)
export function decodeTokenPayload(token: string): JWTPayload | null {
  try {
    // Primero verificar si el token está expirado
    if (isTokenExpired(token)) {
      return null;
    }

    // Decodificar sin verificar la firma (solo para obtener el payload)
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );

    // Verificar que tenga las propiedades esperadas
    if (decoded.userId && decoded.email && decoded.role && decoded.name) {
      return decoded as JWTPayload;
    }
    return null;
  } catch (error) {
    console.error("Error al decodificar token:", error);
    return null;
  }
}
