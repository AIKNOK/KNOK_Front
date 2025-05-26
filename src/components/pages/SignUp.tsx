import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';

export const SignUp: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    jobField: '',
    careerYears: '',
  });

  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    jobField: '',
    careerYears: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phone: '',
      jobField: '',
      careerYears: '',
    };
    let isValid = true;

    // 이메일 검증
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
      isValid = false;
    }

    // 비밀번호 검증
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다';
      isValid = false;
    }

    // 비밀번호 확인 검증
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
      isValid = false;
    }

    // 이름 검증
    if (!formData.name) {
      newErrors.name = '이름을 입력해주세요';
      isValid = false;
    }

    // 전화번호 검증
    if (!formData.phone) {
      newErrors.phone = '전화번호를 입력해주세요';
      isValid = false;
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/-/g, ''))) {
      newErrors.phone = '올바른 전화번호 형식이 아닙니다';
      isValid = false;
    }

    // 직무 분야 검증
    if (!formData.jobField) {
      newErrors.jobField = '직무 분야를 입력해주세요';
      isValid = false;
    }

    // 경력 연차 검증
    if (!formData.careerYears) {
      newErrors.careerYears = '경력 연차를 입력해주세요';
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
      // TODO: Implement signup logic
      console.log('Signup attempt with:', formData);
    } catch (error) {
      console.error('Signup failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            회원가입
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="font-medium text-primary hover:text-primary-dark">
              로그인하기
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
              required
            />

            <Input
              label="비밀번호"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="••••••••"
              helperText="8자 이상 입력해주세요"
              autoComplete="new-password"
              required
            />

            <Input
              label="비밀번호 확인"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />

            <Input
              label="이름"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              placeholder="홍길동"
              autoComplete="name"
              required
            />

            <Input
              label="전화번호"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              placeholder="01012345678"
              autoComplete="tel"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                직무 분야
              </label>
              <select
                name="jobField"
                value={formData.jobField}
                onChange={handleChange}
                className={`
                  w-full px-3 py-2 border rounded-md shadow-sm
                  focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                  ${errors.jobField ? 'border-red-500' : 'border-gray-300'}
                `}
                required
              >
                <option value="">선택해주세요</option>
                <option value="frontend">프론트엔드</option>
                <option value="backend">백엔드</option>
                <option value="fullstack">풀스택</option>
                <option value="mobile">모바일</option>
                <option value="devops">DevOps</option>
                <option value="data">데이터</option>
              </select>
              {errors.jobField && (
                <p className="mt-1 text-sm text-red-600">{errors.jobField}</p>
              )}
            </div>

            <Input
              label="경력 연차"
              type="number"
              name="careerYears"
              value={formData.careerYears}
              onChange={handleChange}
              error={errors.careerYears}
              placeholder="0"
              min="0"
              max="50"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              id="agree-terms"
              name="agree-terms"
              type="checkbox"
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              required
            />
            <label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-900">
              <span>
                <Link to="/terms" className="font-medium text-primary hover:text-primary-dark">
                  이용약관
                </Link>
                {' '}및{' '}
                <Link to="/privacy" className="font-medium text-primary hover:text-primary-dark">
                  개인정보처리방침
                </Link>
                에 동의합니다
              </span>
            </label>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full"
            size="lg"
          >
            회원가입
          </Button>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">
                  또는
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <img
                  className="h-5 w-5 mr-2"
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google logo"
                />
                Google
              </button>
              <button
                type="button"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <img
                  className="h-5 w-5 mr-2"
                  src="https://www.svgrepo.com/show/475647/github-color.svg"
                  alt="GitHub logo"
                />
                GitHub
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}; 