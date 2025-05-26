import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../shared/Button';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-primary">
              Interview Platform
            </Link>
            <div className="hidden md:block ml-10">
              <div className="flex space-x-4">
                <Link to="/interview" className="text-gray-700 hover:text-primary px-3 py-2 rounded-md">
                  면접
                </Link>
                <Link to="/library" className="text-gray-700 hover:text-primary px-3 py-2 rounded-md">
                  라이브러리
                </Link>
                <Link to="/feedback" className="text-gray-700 hover:text-primary px-3 py-2 rounded-md">
                  피드백
                </Link>
                <Link to="/about" className="text-gray-700 hover:text-primary px-3 py-2 rounded-md">
                  소개
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="outline" size="sm">로그인</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">회원가입</Button>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}; 