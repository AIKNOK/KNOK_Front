import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="pt-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h2 className="text-primary text-base font-semibold tracking-wider uppercase">
              OUR SERVICES
            </h2>
            <h1 className="mt-4 text-4xl font-medium tracking-tight text-gray-900 sm:text-5xl">
              똑똑..<br />
              당신의 취업문을 두드리는 "노크"
            </h1>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-36 h-36 mx-auto mb-8 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-medium text-gray-900 mb-4">Goal-Based Practice</h3>
              <p className="text-gray-600">
                원하는 기업과 직무를 목표로 설정하고,<br />
                AI가 맞춤형 면접 훈련을 제공합니다.
              </p>
            </div>

            <div className="text-center">
              <div className="w-36 h-36 mx-auto mb-8 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-2xl font-medium text-gray-900 mb-4">Rapid Skill Boost</h3>
              <p className="text-gray-600">
                단 몇 번의 연습만으로도 확실한 변화를<br />
                느껴보세요. AI 분석 기반의 집중 피드백으로<br />
                면접 실력이 빠르게 향상됩니다.
              </p>
            </div>

            <div className="text-center">
              <div className="w-36 h-36 mx-auto mb-8 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-2xl font-medium text-gray-900 mb-4">Structured Answer Design</h3>
              <p className="text-gray-600">
                AI가 논리 흐름, 일관된 답변, 키워드 연결,<br />
                핵심 전달력을 분석해 더 설득력 있는<br />
                응답 플로우로 다듬어드립니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-[url('/images/cta-bg.jpg')] bg-cover bg-center">
            <div className="absolute inset-0 bg-black/70" />
            <div className="relative py-24 px-8 text-center">
              <h2 className="text-4xl md:text-6xl font-medium text-white mb-8">
                Ready for your project
              </h2>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/interview"
                  className="inline-flex items-center px-12 py-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-2xl"
                >
                  Get started
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 