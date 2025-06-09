import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

// pages
import HomePage from "./pages/HomePage";
import AboutUs from "./pages/AboutUs";
import History from "./pages/History";      // 새로 만든 History 페이지
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import Contact from "./pages/Contact";

// interview
import { UploadResume } from "./pages/interview/UploadResume";
import { InterviewSetting } from "./pages/interview/InterviewSetting";
import { EnvironmentCheck } from "./pages/interview/EnvironmentCheck";
import { InterviewSession } from "./pages/interview/InterviewSession";
import FeedbackReport from "./pages/interview/FeedbackReport";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
        {/* 상단 네비 */}
        <Header />

        {/* 콘텐츠 (헤더 높이만큼 pt + 적당한 pb) */}
        <div className="flex-1 pt-[92px] pb-16">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/history" element={<History />} />

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/contact" element={<Contact />} />

            <Route path="/interview/upload-resume" element={<UploadResume />} />
            <Route path="/interview/setting"      element={<InterviewSetting />} />
            <Route path="/interview/check-environment" element={<EnvironmentCheck />} />
            <Route path="/interview/session"      element={<InterviewSession />} />
            <Route path="/interview/feedback"     element={<FeedbackReport />} />
            <Route path="/interview/feedback/:id" element={<FeedbackReport />} />
          </Routes>
        </div>

        {/* 하단 푸터 */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;
