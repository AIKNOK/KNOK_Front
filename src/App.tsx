import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { HomePage } from './components/pages/HomePage';
import { Login } from './components/pages/Login';
import { Register } from './pages/Register';
import { InterviewSetting } from './components/pages/interview/InterviewSetting';
import { EnvironmentCheck } from './components/pages/interview/EnvironmentCheck';
import { InterviewSession } from './components/pages/interview/InterviewSession';
import { FeedbackReport } from './components/pages/interview/FeedbackReport';
import { Library } from './components/pages/Library';
import { MyPage } from './components/pages/MyPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/interview/setting" element={<InterviewSetting />} />
          <Route path="/interview/check-environment" element={<EnvironmentCheck />} />
          <Route path="/interview/session" element={<InterviewSession />} />
          <Route path="/interview/feedback" element={<FeedbackReport />} />
          <Route path="/interview/feedback/:id" element={<FeedbackReport />} />
          <Route path="/library" element={<Library />} />
          <Route path="/mypage" element={<MyPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 