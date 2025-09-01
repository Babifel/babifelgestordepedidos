'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'administradora' | 'vendedora';
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState({
          user: data.user,
          loading: false,
          error: null
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        setAuthState({
          user: null,
          loading: false,
          error: errorData.error || 'No autenticado'
        });
      }
    } catch (error) {
      console.error('Error en checkAuth:', error);
      setAuthState({
        user: null,
        loading: false,
        error: 'Error al verificar autenticación'
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        setAuthState({
          user: userData.user,
          loading: false,
          error: null
        });
        return { success: true };
      } else {
        const errorData = await response.json();
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: errorData.error || 'Error al iniciar sesión'
        }));
        return { success: false, error: errorData.error };
      }
    } catch (error) {
      const errorMessage = 'Error de conexión';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      setAuthState({
        user: null,
        loading: false,
        error: null
      });
      
      router.push('/login');
    } catch (error) {
      // Incluso si hay error, limpiamos el estado local
      setAuthState({
        user: null,
        loading: false,
        error: null
      });
      router.push('/login');
    }
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    login,
    logout,
    checkAuth
  };
}

// Hook para verificar si el usuario está autenticado
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  return { user, loading };
}

// Hook para verificar roles específicos
export function useRequireRole(requiredRole: 'administradora' | 'vendedora') {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== requiredRole) {
        // Redirigir según el rol del usuario
        if (user.role === 'vendedora') {
          router.push('/pedidos');
        } else if (user.role === 'administradora') {
          router.push('/dashboard');
        }
      }
    }
  }, [user, loading, requiredRole, router]);

  return { user, loading };
}