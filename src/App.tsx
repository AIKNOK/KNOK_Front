// src/App.tsx

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

// pages
import HomePage from "./pages/HomePage";
import AboutUs from "./pages/AboutUs";
import { Library } from "./pages/Library";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import Contact from "./pages/Contact";

// interview related
import { UploadResume } from "./pages/interview/UploadResume";
import { InterviewSetting } from "./pages/interview/InterviewSetting";
import { EnvironmentCheck } from "./pages/interview/EnvironmentCheck";
import { InterviewSession } from "./pages/interview/InterviewSession";
import FeedbackReport from "./pages/interview/FeedbackReport";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* 상단 고정 네비게이션 */}
        <Header />

        {/* 콘텐츠 영역: Header 높이(92px) 만큼 패딩 */}
        <div className="flex-1 pt-[92px]">
          <Routes>
            {/* ─── 홈 & 기타 ─── */}
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/library" element={<Library />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/contact" element={<Contact />} />

            {/* ─── 인터뷰 흐름 ─── */}
            <Route path="/interview/upload-resume" element={<UploadResume />} />
            <Route path="/interview/setting" element={<InterviewSetting />} />
            <Route path="/interview/check-environment" element={<EnvironmentCheck />} />
            <Route path="/interview/session" element={<InterviewSession />} />
            <Route path="/interview/feedback" element={<FeedbackReport />} />
            <Route path="/interview/feedback/:id" element={<FeedbackReport />} />
          </Routes>
        </div>

        {/* 모든 페이지 하단에 고정될 푸터 */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;
