// src/services/auth.ts
import { publicApi, privateApi } from './api';

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token?: string;
}

export interface EmailConfirmRequest {
  email: string;
  code: string;
}

export const authApi = {
  // 🔓 회원가입 (공개)
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await publicApi.post<AuthResponse>('/signup/', data);
    return response.data;
  },

  // 🔓 이메일 인증 (공개)
  confirmEmail: async (data: EmailConfirmRequest): Promise<AuthResponse> => {
    const response = await publicApi.post<AuthResponse>('/confirm-email/', data);
    return response.data;
  },

  // 🔓 로그인 (공개)
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await publicApi.post<AuthResponse>('/login/', data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  // 🔐 로그아웃 (토큰 삭제)
  logout: () => {
    localStorage.removeItem('token');
  },
};
