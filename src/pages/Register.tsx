import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/shared/Button';
import { authApi } from '../services/auth';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    code: '',
  });

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
      confirmPassword: '',
      code: '',
    };
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
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다';
      isValid = false;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
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
      const { confirmPassword, ...registerData } = formData;
      await authApi.register(registerData);
      setVerificationStep(true);
    } catch (error: any) {
      console.error('회원가입 실패:', error);
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error;
        if (errorMessage.includes('email')) {
          setErrors(prev => ({ ...prev, email: errorMessage }));
        } else {
          alert(errorMessage);
        }
      } else {
        alert('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) {
      setErrors(prev => ({ ...prev, code: '인증 코드를 입력해주세요' }));
      return;
    }

    setIsLoading(true);
    try {
      await authApi.confirmEmail({
        email: formData.email,
        code: verificationCode,
      });
      navigate('/login', {
        state: {
          message: '이메일 인증이 완료되었습니다. 로그인해주세요.',
        },
      });
    } catch (error: any) {
      console.error('이메일 인증 실패:', error);
      if (error.response?.data?.error) {
        setErrors(prev => ({ ...prev, code: error.response.data.error }));
      } else {
        alert('이메일 인증 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  if (verificationStep) {
    return (
      <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-normal text-gray-900">이메일 인증</h2>
            <p className="mt-2 text-sm text-gray-600">
              {formData.email}로 전송된 인증 코드를 입력해주세요
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleVerification}>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                인증 코드
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-4 border border-[#e8e8e8] placeholder-[#757575] text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="인증 코드 6자리"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value);
                  if (errors.code) {
                    setErrors(prev => ({ ...prev, code: '' }));
                  }
                }}
              />
              {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              인증 확인
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-normal text-gray-900">회원가입</h2>
          <p className="mt-2 text-sm text-gray-600">
            당신의 취업문을 열어주는 서비스 노크입니다
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-4 border border-[#e8e8e8] placeholder-[#757575] text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="example@email.com"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-4 border border-[#e8e8e8] placeholder-[#757575] text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none rounded-lg relative block w-full px-4 py-4 border border-[#e8e8e8] placeholder-[#757575] text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
          >
            회원가입
          </Button>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="font-medium text-primary hover:text-primary/90">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}; 