// Footer.tsx
import React from "react";
import { Link } from "react-router-dom";

const navigation = [
  { name: "Home",      href: "/" },
  { name: "About us",  href: "/about" },
  { name: "Interview", href: "/interview/upload-resume" },
  { name: "History",   href: "/history" },
];

export default function Footer() {
  return (
    <footer className="bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* 로고 */}
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="KNOK Logo" className="h-8 w-auto" />
            <span className="text-xl font-semibold text-primary">
              KNOK
            </span>
          </Link>

          {/* 간단한 네비 메뉴 */}
          <nav className="flex space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-gray-100 hover:text-gray-300 text-base font-medium"
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
