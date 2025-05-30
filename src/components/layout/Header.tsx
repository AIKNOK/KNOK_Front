import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { name: "Home", path: "/" },
  { name: "About us", path: "/about" },
  { name: "Interview", path: "/interview" },
  { name: "Library", path: "/library" },
];

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    const onStorageChange = () => setToken(localStorage.getItem("token"));
    window.addEventListener("storageChange", onStorageChange);
    return () => window.removeEventListener("storageChange", onStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    navigate("/login");
    window.dispatchEvent(new Event("storageChange"));
  };

  const hideOn = [
    "/mypage",
    "/interview/check-environment",
    "/interview/session",
    "/interview/feedback",
  ];
  if (hideOn.includes(pathname)) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[92px]">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/images/logo.png" alt="KNOK Logo" className="h-12 w-auto" />
            <span className="text-[32px] font-semibold text-primary tracking-tighter">
              KNOK
            </span>
          </Link>

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

          <div className="flex items-center space-x-4">
            {!token ? (
              <>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/login"
                    className="bg-primary text-white px-6 py-3 rounded-md text-base font-medium tracking-tight hover:bg-primary/90 transition-colors"
                  >
                    Login
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/mypage"
                    className="bg-primary text-white px-6 py-3 rounded-md text-base font-medium tracking-tight hover:bg-primary/90 transition-colors"
                  >
                    마이페이지
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
