// src/components/auth/Login.tsx

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "../shared/Input";
import { Button } from "../shared/Button";
import Layout from "../layout";

// ───────────────────────────────────────────────────────────
// environment 변수 (Vite .env에서 읽어옵니다)
// ───────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL;  // e.g. "http://localhost:8000/api"

export const Login: React.FC = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // ───────────────────────────────────────────────────────────
      // 로그인 API 호출: POST ${API_BASE}/login/
      // ───────────────────────────────────────────────────────────
      const response = await fetch(`${API_BASE}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        // 404: 등록되지 않은 이메일
        if (response.status === 404) {
          setErrors((prev) => ({
            ...prev,
            email: "등록되지 않은 이메일입니다",
          }));
        }
        // 401: 비밀번호 불일치
        else if (response.status === 401) {
          setErrors((prev) => ({
            ...prev,
            password: "비밀번호가 올바르지 않습니다",
          }));
        }
        // 기타 에러
        else {
          setErrors((prev) => ({
            ...prev,
            email: "로그인에 실패했습니다",
          }));
        }
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      // ───────────────────────────────────────────────────────────
      //  로그인 성공: 토큰 + user_email 저장
      // ───────────────────────────────────────────────────────────
      // access_token 혹은 id_token 중 하나를 우선 저장
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("token", data.access_token);
      }
      if (data.id_token) {
        localStorage.setItem("id_token", data.id_token);
        localStorage.setItem("token", data.id_token);
      }
      // user_email 필수 저장 (WebSocket 등에서 사용)
      localStorage.setItem("user_email", formData.email);

      // ───────────────────────────────────────────────────────────
      // Header(최상단) 등의 상태 갱신을 위해 이벤트 발동
      // ───────────────────────────────────────────────────────────
      window.dispatchEvent(new Event("storageChange"));

      // 로그인 후 리다이렉트 (홈페이지 또는 다른 페이지)
      navigate("/");
    } catch (err) {
      console.error("로그인 오류:", err);
      setErrors((prev) => ({
        ...prev,
        email: "서버와의 통신에 실패했습니다",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              로그인
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              아직 계정이 없으신가요?{" "}
              <Link
                to="/register"
                className="font-medium text-primary hover:text-primary/90"
              >
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

            <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
              로그인
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
};
