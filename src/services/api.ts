// src/services/api.ts
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// 🔓 공개 API용 - 토큰 없음
export const publicApi = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔐 인증 API용 - 토큰 포함
export const privateApi = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 수동 설정 함수
export const setAuthToken = (token: string | null) => {
  if (token) {
    privateApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete privateApi.defaults.headers.common['Authorization'];
  }
};

// 토큰을 사용하는 API 호출 함수
export const apiWithAuth = (token: string | null) => {
  const instance = axios.create({
    baseURL: API_BASE,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  
  // 응답 인터셉터 - 401 시 로그인 이동
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // 로그아웃 처리는 컴포넌트에서 useAuth().logout()을 사용
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
  
  return instance;
};

// 응답 인터셉터 - 401 시 로그인 이동
privateApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 로그아웃 처리는 AuthContext의 logout 함수를 사용하도록 수정
      // 여기서는 단순히 로그인 페이지로 이동만 처리
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
