import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';

// 환경변수로 API 서버 호스트 관리
// frontend/.env (프로젝트 루트)에 아래를 추가하세요:
// VITE_API_BASE_URL=http://127.0.0.1:8000
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // 예: http://127.0.0.1:8000
});

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = { email: '', password: '' };
    let isValid = true;

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Django DRF 로그인 엔드포인트에 맞춘 POST
      const response = await api.post('/api/login/', formData);
      const accessToken = response.data.token;

      // 토큰 저장 및 헤더 갱신 이벤트
      localStorage.setItem('token', accessToken);
      window.dispatchEvent(new Event('storageChange'));

      // 마이페이지 이동
      navigate('/mypage');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setErrors(prev => ({ ...prev, email: '등록되지 않은 이메일입니다' }));
      } else if (err.response?.status === 401) {
        setErrors(prev => ({ ...prev, password: '비밀번호가 올바르지 않습니다' }));
      } else {
        console.error('로그인 실패:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">로그인</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            아직 계정이 없으신가요?{' '}
            <Link to="/register" className="font-medium text-primary hover:text-primary/90">
              회원가입하기
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="이메일"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="example@email.com"
              autoComplete="email"
            />
            <Input
              label="비밀번호"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                로그인 상태 유지
              </label>
            </div>

            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-primary hover:text-primary/90">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          </div>

          <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
            로그인
          </Button>
        </form>
      </div>
    </div>
  );
};