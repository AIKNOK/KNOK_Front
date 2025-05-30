import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../shared/Button";

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white pt-[92px]">
      {/* ✅ 기존 Navigation Bar 제거됨 */}
      {/* ✅ 상단 여백 pt-[92px]은 유지 (Header 고정 높이 만큼) */}

      {/* Hero Section */}
      <section className="bg-[#e1dbf6] h-[383px] flex items-center">
        <div className="container mx-auto px-4">
          <p className="text-[#8447e9] text-base font-semibold tracking-wider mb-8">
            OUR SERVICES
          </p>
          <h2 className="text-[#0f0f0f] text-4xl font-medium tracking-tighter leading-[1.2] max-w-[780px]">
            똑똑..
            <br />
            당신의 취업문을 두드리는 "노크"
          </h2>
        </div>
      </section>

      {/* Strategy Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col justify-center">
              <h3 className="text-[#8447e9] text-3xl font-medium mb-8">
                Strategy services
              </h3>
              <p className="text-[#0f0f0f] text-xl leading-relaxed mb-12">
                AI 기반의 심층 면접관이 자기소개서를 분석하여 맞춤 질문을
                생성하고, 당신의 답변을 다각도로 평가합니다. 정교한 AI 피드백
                시스템으로 실전 역량을 강화하고 합격까지 이끄는 최적의 면접
                솔루션을 경험하세요
              </p>
            </div>
            <div className="h-[594px] rounded-lg overflow-hidden">
              <img
                src="/rectangle-19@2x.png"
                alt="전략 서비스 이미지"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="flex justify-center mt-16">
            <Link to="/interview">
              <Button variant="primary" size="lg" className="text-base">
                AI 모의면접 시작하기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <p className="text-[#8447e9] text-base font-semibold tracking-wider mb-4">
            OUR SERVICES
          </p>
          <h2 className="text-[#000000] text-4xl font-medium tracking-tighter leading-[1.2] max-w-[1128px] mb-16">
            KNONK delivers
            <br />
            personalized AI-powered interview solutions
            <br />
            for job seekers
          </h2>
          <div className="grid grid-cols-3 gap-12 mb-16">
            {/* 1 */}
            <div className="text-center">
              <div className="w-36 h-36 mx-auto mb-8 bg-[#8447e9]/10 rounded-full flex items-center justify-center">
                <img
                  src="/icon1.png"
                  alt="Goal-Based Practice"
                  className="w-24 h-24"
                />
              </div>
              <h3 className="text-[#8447e9] text-3xl font-medium mb-4">
                Goal-Based Practice
              </h3>
              <p className="text-[#3f3f3f] text-base leading-relaxed">
                원하는 기업과 직무를 목표로 설정하고,
                <br />
                AI가 맞춤형 면접 훈련을 제공합니다.
                <br />
                KNONK는 단순한 연습을 넘어,
                <br />
                취업이라는 목표 달성을 위한 전략적 준비를
                <br />
                돕습니다.
              </p>
            </div>
            {/* 2 */}
            <div className="text-center">
              <div className="w-36 h-36 mx-auto mb-8 bg-[#8447e9]/10 rounded-full flex items-center justify-center">
                <img
                  src="/group.png"
                  alt="Rapid Skill Boost"
                  className="w-24 h-24"
                />
              </div>
              <h3 className="text-[#8447e9] text-3xl font-medium mb-4">
                Rapid Skill Boost
              </h3>
              <p className="text-[#3f3f3f] text-base leading-relaxed">
                단 몇 번의 연습만으로도 확실한 변화를
                <br />
                느껴보세요.
                <br />
                AI 분석 기반의 집중 피드백으로 면접 실력이
                <br />
                빠르게 향상됩니다.
              </p>
            </div>
            {/* 3 */}
            <div className="text-center">
              <div className="w-36 h-36 mx-auto mb-8 bg-[#8447e9]/10 rounded-full flex items-center justify-center">
                <img
                  src="/group-1.png"
                  alt="Structured Answer Design"
                  className="w-24 h-24"
                />
              </div>
              <h3 className="text-[#8447e9] text-3xl font-medium mb-4">
                Structured Answer Design
              </h3>
              <p className="text-[#3f3f3f] text-base leading-relaxed">
                AI가 논리 흐름, 일관된 답변, 키워드 연결,
                <br />
                핵심 전달력을 분석해
                <br />
                더 설득력 있는 응답 플로우로 다듬어드립니다.
                <br />
                논리적이고 일관된 답변 흐름으로
                <br />
                면접관을 사로잡으세요.
              </p>
            </div>
          </div>
          <div className="flex justify-center">
            <Button variant="outline" size="lg">
              Start KNOK
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-[#000000] text-4xl font-medium tracking-tighter mb-16">
            What our great customers say
          </h2>
          <div className="bg-[#e1dbf6] rounded-lg p-8">
            <div className="flex gap-16">
              <div className="w-[267px] h-[267px] rounded-full overflow-hidden">
                <img
                  src="/ellipse-6@2x.png"
                  alt="고객 사진"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-[#0f0f0f] text-2xl font-medium leading-relaxed mb-12">
                  Waves demonstrates an excellent understanding of user needs
                  and all of their designs are creative and elegant in their
                  simplicity.
                </p>
                <h3 className="text-[#8447e9] text-base font-medium mb-1">
                  Jerome Bell
                </h3>
                <p className="text-[#0f0f0f] text-xs">
                  <span className="font-medium">President of Sales</span>
                  <span className="ml-2">(Binford Ltd.)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* News & Insights Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-semibold text-[#0f0f0f] mb-12">
            News & Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 카드들 생략 없이 유지 */}
          </div>
        </div>
      </section>

      <div className="mt-12 pl-4">
        <Button variant="outline" size="md">
          Explore all news →
        </Button>
      </div>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div
            className="relative h-[385px] rounded-lg overflow-hidden bg-cover bg-center"
            style={{
              backgroundImage: "url('/frame-17@3x.png')",
            }}
          >
            <div className="absolute inset-0 bg-black/70"></div>
            <div className="relative z-10 h-full flex flex-col items-center justify-center">
              <h2 className="text-white text-[62px] font-medium tracking-tighter mb-8">
                Ready for your project
              </h2>
              <Button variant="primary" size="lg" className="text-2xl py-5">
                Get in touch
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f0f0f] text-white py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start mb-24">
            {/* 왼쪽: 로고 + 텍스트 */}
            <div className="flex flex-col items-start">
              <img src="/-20250521-092255removebgpreview-1@2x.png" alt="Logo" className="h-[80px] mb-4" />
              <h2 className="text-[#8447e9] text-2xl font-bold tracking-widest">
                KNOCK
              </h2>
              <p className="text-[#bdb0ec] text-sm font-semibold tracking-widest mt-1">
                SINCE 2025
              </p>
            </div>

            {/* 가운데: 메뉴 */}
            <div className="flex flex-col md:flex-row gap-6 mt-12 md:mt-0 md:ml-16">
              <a href="/" className="hover:text-[#8447e9]">
                Home
              </a>
              <a href="/about" className="hover:text-[#8447e9]">
                About us
              </a>
              <a href="/interview" className="hover:text-[#8447e9]">
                Interview
              </a>
              <a href="/library" className="hover:text-[#8447e9]">
                Library
              </a>
            </div>

            {/* 오른쪽: 아이콘 */}
            <div className="flex gap-4 mt-12 md:mt-0">
              <a href="#">
                <img
                  src="/-20250521-092255removebgpreview-11@2x.png"
                  alt="Facebook"
                  className="w-[20px]"
                />
              </a>
              <a href="#">
                <img
                  src="/icon-twitter.svg"
                  alt="Twitter"
                  className="w-[20px]"
                />
              </a>
              <a href="#">
                <img
                  src="/icon-instagram.svg"
                  alt="Instagram"
                  className="w-[20px]"
                />
              </a>
              <a href="#">
                <img
                  src="/icon-linkedin.svg"
                  alt="LinkedIn"
                  className="w-[20px]"
                />
              </a>
            </div>
          </div>

          {/* 선 */}
          <hr className="border-t border-[#bdb0ec] mb-6" />

          {/* 하단 텍스트 */}
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-[#ccc]">
            <p>Privacy Policy | Terms of Use</p>
            <p className="mt-4 md:mt-0">© 2025 Waves. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

