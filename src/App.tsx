// src/App.tsx

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/layout/Header";

// pages
import HomePage from "./pages/HomePage";
import AboutUs from "./pages/AboutUs";
import {Library} from "./pages/Library";
import {Login} from "./pages/Login";
import {Register} from "./pages/Register";
import Contact from "./pages/Contact";

// interview 관련
import {UploadResume} from "./pages/interview/UploadResume";       // 이전 MyPage → UploadResume
import {InterviewSetting} from "./pages/interview/InterviewSetting";
import {EnvironmentCheck} from "./pages/interview/EnvironmentCheck";
import {InterviewSession} from "./pages/interview/InterviewSession";
import FeedbackReport from "./pages/interview/FeedbackReport";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* 상단 고정 네비게이션 */}
        <Header />

        {/* 화면 여백 확보 (Header 높이 92px 만큼) */}
        <div className="pt-[92px]">
          <Routes>
            {/* ────────────────────────── 홈 & 기타 ────────────────────────── */}
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/library" element={<Library />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/contact" element={<Contact />} />

            {/* ────────────────────────── 인터뷰 흐름 ────────────────────────── */}
            {/* 이력서 업로드 & AI 면접 시작 페이지 */}
            <Route path="/interview/upload-resume" element={<UploadResume />} />
            {/* 이력서 업로드 후 설정 페이지 */}
            <Route path="/interview/setting" element={<InterviewSetting />} />
            {/* 환경 체크 페이지 */}
            <Route path="/interview/check-environment" element={<EnvironmentCheck />} />
            {/* 실제 면접 세션 페이지 */}
            <Route path="/interview/session" element={<InterviewSession />} />
            {/* 피드백 리포트 페이지 (목록 / 상세) */}
            <Route path="/interview/feedback" element={<FeedbackReport />} />
            <Route path="/interview/feedback/:id" element={<FeedbackReport />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
