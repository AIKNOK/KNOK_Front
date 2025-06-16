// src/pages/HomePage.tsx

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/shared/Button";

export const HomePage: React.FC = () => {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-[#e1dbf6] h-[383px] flex items-center">
        <div className="container mx-auto px-4">
          <p className="text-[#8447e9] text-base font-semibold tracking-wider mb-8">
            OUR SERVICES
          </p>
          <h2 className="text-[#0f0f0f] text-4xl font-medium tracking-tighter leading-[1.2] max-w-[780px] mb-6">
            똑똑..
            <br />
            당신의 취업문을 두드리는 "노크"
          </h2>

          <Link to="/interview/upload-resume">
            <Button variant="primary" size="lg" className="text-base px-6 py-3">
              AI 모의면접 시작하기
            </Button>
          </Link>
        </div>
      </section>

      {/* Strategy Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col justify-center">
              <h3 className="text-[#8447e9] text-3xl font-medium mb-8">
                Strategy services
              </h3>
              <p className="text-[#0f0f0f] text-xl leading-relaxed mb-12">
                AI 기반의 심층 면접관이 자기소개서를 분석하여 맞춤 질문을 생성하고,
                당신의 답변을 다각도로 평가합니다. 정교한 AI 피드백 시스템으로
                실전 역량을 강화하고 합격까지 이끄는 최적의 면접 솔루션을 경험하세요.
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
            {/* 1 */}
            <div className="text-center">
              <div className="w-36 h-36 mx-auto mb-8 bg-[#8447e9]/10 rounded-full flex items-center justify-center">
                <img src="/icon1.png" alt="Goal-Based Practice" className="w-24 h-24" />
              </div>
              <h3 className="text-[#8447e9] text-3xl font-medium mb-4">
                Goal-Based Practice
              </h3>
              <p className="text-[#3f3f3f] text-base leading-relaxed">
                원하는 기업과 직무를 목표로 설정하고, <br />
                AI가 맞춤형 면접 훈련을 제공합니다. <br />
                KNONK는 단순한 연습을 넘어, <br />
                취업이라는 목표 달성을 위한 전략적 준비를 돕습니다.
              </p>
            </div>
            {/* 2 */}
            <div className="text-center">
              <div className="w-36 h-36 mx-auto mb-8 bg-[#8447e9]/10 rounded-full flex items-center justify-center">
                <img src="/group.png" alt="Rapid Skill Boost" className="w-24 h-24" />
              </div>
              <h3 className="text-[#8447e9] text-3xl font-medium mb-4">
                Rapid Skill Boost
              </h3>
              <p className="text-[#3f3f3f] text-base leading-relaxed">
                단 몇 번의 연습만으로도 확실한 변화를 <br />
                느껴보세요. <br />
                AI 분석 기반의 집중 피드백으로 면접 실력이 빠르게 향상됩니다.
              </p>
            </div>
            {/* 3 */}
            <div className="text-center">
              <div className="w-36 h-36 mx-auto mb-8 bg-[#8447e9]/10 rounded-full flex items-center justify-center">
                <img src="/group-1.png" alt="Structured Answer Design" className="w-24 h-24" />
              </div>
              <h3 className="text-[#8447e9] text-3xl font-medium mb-4">
                Structured Answer Design
              </h3>
              <p className="text-[#3f3f3f] text-base leading-relaxed">
                AI가 논리 흐름, 일관된 답변, 키워드 연결, 핵심 전달력을 분석해 <br />
                더 설득력 있는 응답 플로우로 다듬어드립니다. <br />
                논리적이고 일관된 답변 흐름으로 면접관을 사로잡으세요.
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

      

      

      
    </>
  );
};

export default HomePage;
