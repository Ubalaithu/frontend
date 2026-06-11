import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { connectSocket, disconnectSocket } from '../api/socket';

interface AuthUser {
  id:       number;
  name:     string;
  role:     string;
  branchId: number | null;
}

interface AuthContextType {
  user:      AuthUser | null;
  token:     string | null;
  isLoading: boolean;
  login:     (token: string, user: AuthUser) => void;
  logout:    () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<AuthUser | null>(null);
  const [token,     setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('steakz_token');
    const storedUser  = localStorage.getItem('steakz_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      connectSocket(storedToken);
    }
    setIsLoading(false);
  }, []);

  function login(t: string, u: AuthUser) {
    localStorage.setItem('steakz_token', t);
    localStorage.setItem('steakz_user',  JSON.stringify(u));
    setToken(t);
    setUser(u);
    connectSocket(t);
  }

  function logout() {
    localStorage.removeItem('steakz_token');
    localStorage.removeItem('steakz_user');
    setToken(null);
    setUser(null);
    disconnectSocket();
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
