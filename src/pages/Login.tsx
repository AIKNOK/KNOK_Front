import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Input } from "../components/shared/Input";
import { Button } from "../components/shared/Button";
import Layout from "../components/layout/Layout";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  // 폼 유효성 검사
  const validateForm = () => {
    const newErrors = { email: "", password: "" };
    let isValid = true;

    if (!formData.email) {
      newErrors.email = "이메일을 입력해주세요";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "올바른 이메일 형식이 아닙니다";
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = "비밀번호를 입력해주세요";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // 로그인 요청 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        // 상태 코드에 따른 에러 메시지 설정
        if (res.status === 404) {
          setErrors(prev => ({ ...prev, email: "등록되지 않은 이메일입니다" }));
        } else if (res.status === 401) {
          setErrors(prev => ({ ...prev, password: "비밀번호가 올바르지 않습니다" }));
        } else {
          setErrors(prev => ({ ...prev, email: "로그인에 실패했습니다" }));
        }
        return;
      }

      const data = await res.json();
      // id_token 또는 access_token 사용
      const token = data.id_token || data.access_token;
      if (!token) {
        setErrors(prev => ({ ...prev, email: "토큰이 정상적으로 발급되지 않았습니다." }));
        return;
      }

      // 토큰과 이메일을 AuthContext에 저장 (localStorage 포함)
      login(token, formData.email);
      // 로그인 성공 후 메인으로 이동
      navigate("/");
    } catch (err) {
      console.error("로그인 오류:", err);
      setErrors(prev => ({ ...prev, email: "서버와의 통신에 실패했습니다" }));
    } finally {
      setIsLoading(false);
    }
  };

  // 입력값 변경 처리
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <Layout noPadding noFooter>
      <div className="
          flex items-center justify-center bg-gray-50
          pt-4 pb-12 px-4 sm:px-6 lg:px-8
          min-h-[calc(100vh-92px)]
        ">
        <div className="max-w-md w-full space-y-8 py-12">
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            아직 계정이 없으신가요?{' '}
            <Link
              to="/register"
              className="font-medium text-primary hover:text-primary/90"
            >
              회원가입하기
            </Link>
          </p>

          <form className="space-y-6" onSubmit={handleSubmit}>
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
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-900"
                >
                  로그인 상태 유지
                </label>
              </div>
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-primary hover:text-primary/90"
                >
                  비밀번호를 잊으셨나요?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full"
              size="lg"
            >
              로그인
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
};
