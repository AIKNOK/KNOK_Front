// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthContextValue {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();

  // 앱 시작 시 localStorage에서 ID 토큰 또는 Access 토큰 순으로 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('id_token') || localStorage.getItem('access_token');
    if (saved) {
      setToken(saved);
    }
  }, []);

  // 로그인 시 ID 토큰으로 저장 및 페이지 이동
  const login = (newToken: string) => {
    // ID 토큰을 우선 저장
    localStorage.setItem('id_token', newToken);
    // (기존 호환을 위해 access_token도 저장)
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
    navigate('/mypage');
  };

  // 로그아웃 시 토큰 제거 및 로그인 페이지로 이동
  const logout = () => {
    localStorage.removeItem('id_token');
    localStorage.removeItem('access_token');
    setToken(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 훅 형태로 사용
export const useAuth = () => useContext(AuthContext);
