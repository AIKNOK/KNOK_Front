// src/components/layout/Header.tsx

import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

// navItems의 Interview 경로를 '/interview/upload-resume'로 변경
const navItems = [
  { name: "Home", path: "/" },
  { name: "About us", path: "/about" },
  { name: "Interview", path: "/interview/upload-resume" },  // 변경된 부분
  { name: "Library", path: "/library" },
];

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // 로컬 스토리지에 token이 있으면 로그인 상태로 간주
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );

  useEffect(() => {
    const onStorageChange = () =>
      setToken(localStorage.getItem("token"));
    window.addEventListener("storageChange", onStorageChange);
    return () =>
      window.removeEventListener("storageChange", onStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    navigate("/login");
    window.dispatchEvent(new Event("storageChange"));
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[92px]">
          {/* 로고 및 홈 링크 */}
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="KNOK Logo" className="h-12 w-auto" />
            <span className="text-[32px] font-semibold text-primary tracking-tighter">
              KNOK
            </span>
          </Link>

          {/* 중앙 네비게이션 (데스크톱에서만 visible) */}
          <div className="hidden md:flex items-center space-x-10">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={
                  pathname === item.path
                    ? "text-primary font-medium"
                    : "text-gray-900 font-medium hover:text-primary transition-colors"
                }
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* 우측 로그인/회원가입 또는 문의하기/로그아웃 */}
          <div className="flex items-center space-x-4">
            {!token ? (
              <>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/login"
                    className="bg-primary text-white px-6 py-3 rounded-md text-base font-medium tracking-tight hover:bg-primary/90 transition-colors"
                  >
                    Login
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/register"
                    className="border border-primary text-primary px-6 py-3 rounded-md text-base font-medium tracking-tight hover:bg-primary hover:text-white transition-colors"
                  >
                    Sign Up
                  </Link>
                </motion.div>
              </>
            ) : (
              <>
                {/* 로그인 상태: 문의하기 버튼(기존 마이페이지 위치) */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/contact"
                    className="bg-primary text-white px-6 py-3 rounded-md text-base font-medium tracking-tight hover:bg-primary/90 transition-colors"
                  >
                    문의하기
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <button
                    onClick={handleLogout}
                    className="border border-primary text-primary px-6 py-3 rounded-md text-base font-medium tracking-tight hover:bg-primary hover:text-white transition-colors"
                  >
                    로그아웃
                  </button>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
