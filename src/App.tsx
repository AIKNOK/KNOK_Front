import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';

// pages
import { HomePage } from './pages/HomePage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { MyPage } from './pages/MyPage';
import { Library } from './pages/Library';
import Contact from './pages/Contact';

// interview 관련
import { InterviewSetting } from './pages/interview/InterviewSetting';
import { EnvironmentCheck } from './pages/interview/EnvironmentCheck';
import { InterviewSession } from './pages/interview/InterviewSession';
import { FeedbackReport } from './pages/interview/FeedbackReport';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Routes>
          {/* 홈 */}
          <Route path="/" element={<HomePage />} />

          {/* 인증 */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 마이페이지(또는 문의하기) */}
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/contact" element={<Contact />} />

          {/* 인터뷰 관련 */}
          <Route path="/interview/setting" element={<InterviewSetting />} />
          <Route path="/interview/check-environment" element={<EnvironmentCheck />} />
          <Route path="/interview/session" element={<InterviewSession />} />
          <Route path="/interview/feedback" element={<FeedbackReport />} />
          <Route path="/interview/feedback/:id" element={<FeedbackReport />} />

          {/* 기타 */}
          <Route path="/library" element={<Library />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
