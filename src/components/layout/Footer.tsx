// src/components/Footer.tsx
import React from "react";
import { Link } from "react-router-dom";

const Footer: React.FC = () => (
  <footer className="bg-[#0f0f0f] text-white py-24">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-start mb-24">
        {/* 왼쪽 로고 & 텍스트 */}
        <div className="flex flex-col items-start">
          <img
            src="/-20250521-092255removebgpreview-1@2x.png"
            alt="Logo"
            className="h-[80px] mb-4"
          />
          <h2 className="text-[#8447e9] text-2xl font-bold tracking-widest">
            KNOCK
          </h2>
          <p className="text-[#bdb0ec] text-sm font-semibold tracking-widest mt-1">
            SINCE 2025
          </p>
        </div>

        {/* 중앙 메뉴 */}
        <div className="flex flex-col md:flex-row gap-6 mt-12 md:mt-0 md:ml-16">
          <Link to="/" className="hover:text-[#8447e9]">Home</Link>
          <Link to="/about" className="hover:text-[#8447e9]">About us</Link>
          <Link to="/interview/upload-resume" className="hover:text-[#8447e9]">Interview</Link>
          <Link to="/library" className="hover:text-[#8447e9]">Library</Link>
        </div>

        {/* 오른쪽 소셜 아이콘 */}
        <div className="flex gap-4 mt-12 md:mt-0">
          <a href="#" aria-label="Facebook"><img src="/icon-facebook.svg" alt="Facebook" className="w-[20px]" /></a>
          <a href="#" aria-label="Twitter"><img src="/icon-twitter.svg" alt="Twitter" className="w-[20px]" /></a>
          <a href="#" aria-label="Instagram"><img src="/icon-instagram.svg" alt="Instagram" className="w-[20px]" /></a>
          <a href="#" aria-label="LinkedIn"><img src="/icon-linkedin.svg" alt="LinkedIn" className="w-[20px]" /></a>
        </div>
      </div>

      <hr className="border-t border-[#bdb0ec] mb-6" />

      {/* 하단 텍스트 */}
      <div className="flex flex-col md:flex-row justify-between items-center text-sm text-[#ccc]">
        <p>Privacy Policy | Terms of Use</p>
        <p className="mt-4 md:mt-0">© 2025 Waves. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
