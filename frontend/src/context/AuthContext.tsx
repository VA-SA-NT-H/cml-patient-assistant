import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiClient } from '../api';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture_url: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  setToken: (token: string) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      apiClient.setToken(token);
      fetchUser();
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        logout();
      }
    } catch (error) {
      logout();
    }
  };

  const login = () => {
    window.location.href = `${apiClient.getBaseUrl()}/auth/google`;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const handleSetToken = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user,
      login,
      logout,
      setToken: handleSetToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
