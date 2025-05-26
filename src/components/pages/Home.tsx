import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../shared/Button';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <main>
        {/* Hero Section */}
        <div className="relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block">AI 기반</span>
                <span className="block text-primary">모의 면접 플랫폼</span>
              </h1>
              <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                AI가 제공하는 맞춤형 면접 질문과 실시간 피드백으로 면접 실력을 향상시켜보세요.
              </p>
              <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                <div className="rounded-md shadow">
                  <Link to="/interview">
                    <Button size="lg">
                      면접 시작하기
                    </Button>
                  </Link>
                </div>
                <div className="mt-3 sm:mt-0 sm:ml-3">
                  <Link to="/about">
                    <Button variant="outline" size="lg">
                      서비스 소개
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
              <h2 className="text-base text-primary font-semibold tracking-wide uppercase">
                주요 기능
              </h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                더 나은 면접을 위한 모든 것
              </p>
            </div>

            <div className="mt-10">
              <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
                {/* Feature 1 */}
                <div className="relative">
                  <div className="space-y-6">
                    <div className="h-12 w-12 bg-primary rounded-md flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">AI 기반 맞춤형 질문</h3>
                      <p className="mt-2 text-base text-gray-500">
                        개인의 경력과 포지션에 맞는 맞춤형 면접 질문을 AI가 실시간으로 생성합니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="relative">
                  <div className="space-y-6">
                    <div className="h-12 w-12 bg-primary rounded-md flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">실시간 피드백</h3>
                      <p className="mt-2 text-base text-gray-500">
                        답변에 대한 즉각적인 피드백으로 개선점을 파악하고 더 나은 답변을 준비할 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="relative">
                  <div className="space-y-6">
                    <div className="h-12 w-12 bg-primary rounded-md flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">면접 라이브러리</h3>
                      <p className="mt-2 text-base text-gray-500">
                        다양한 직무별 면접 질문과 모범 답안을 제공하여 면접 준비를 도와드립니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}; 