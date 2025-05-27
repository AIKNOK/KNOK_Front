import { api } from './api';

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
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/signup/', data);
    return response.data;
  },

  confirmEmail: async (data: EmailConfirmRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/confirm-email/', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/login/', data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },
}; 