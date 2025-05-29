// src/components/pages/interview/InterviewSession.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/Button';

interface Question {
  id: string;
  text: string;
  type: 'technical' | 'behavioral';
  difficulty: 'easy' | 'medium' | 'hard';
}

export const InterviewSession: React.FC = () => {
  const navigate = useNavigate();

  // 비디오 feed 참조
  const videoRef = useRef<HTMLVideoElement>(null);

  // 면접 진행 상태
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const totalTime = 30 * 60; // 30분
  const [isGenerating, setIsGenerating] = useState(false);

  // 질문 상태
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: '1',
    text: '자신이 참여했던 프로젝트 중 가장 도전적이었던 경험에 대해 설명해주세요.',
    type: 'behavioral',
    difficulty: 'medium',
  });
  const [nextQuestion, setNextQuestion] = useState<Question | null>({
    id: '2',
    text: 'React의 가상 DOM(Virtual DOM)에 대해 설명해주세요.',
    type: 'technical',
    difficulty: 'medium',
  });

  // 실시간 분석용 인터벌
  const analysisIntervalRef = useRef<number | null>(null);

  // 카메라/마이크 스트림 설정
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        navigate('/interview/check-environment');
      }
    }
    startCamera();

    return () => {
      // 언마운트 시 스트림 종료
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach(track => track.stop());
      // 분석 인터벌 정리
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, [navigate]);

  // 면접 시작 시 타이머 및 실시간 분석 시작
  useEffect(() => {
    if (isInterviewActive) {
      // 타이머
      const timerId = window.setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalTime) {
            handleEndInterview();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // 프레임 캡처 & 분석 API 호출 (3초 간격)
      analysisIntervalRef.current = window.setInterval(() => {
        const video = videoRef.current;
        if (!video) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(async blob => {
          if (!blob) return;
          const form = new FormData();
          form.append('frame', blob, 'frame.jpg');
          try {
            await fetch('/api/interview/analyze', { method: 'POST', body: form });
          } catch (e) {
            console.error('분석 API 오류', e);
          }
        }, 'image/jpeg');
      }, 3000);

      return () => {
        clearInterval(timerId);
      };
    }
  }, [isInterviewActive]);

  const formatTime = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStartInterview = () => {
    setIsInterviewActive(true);
  };

  const handleNextQuestion = () => {
    if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
      // TODO: AI로부터 다음 질문 받기
      setNextQuestion(null);
    }
  };

  const handleEndInterview = async () => {
    setIsInterviewActive(false);
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/interview/feedback/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'CURRENT_SESSION_ID' }),
      });
      if (!res.ok) throw new Error('피드백 생성 실패');
      const { feedbackId } = await res.json();
      navigate(`/interview/feedback/${feedbackId}`);
    } catch (e) {
      console.error(e);
      alert('피드백 생성 중 오류가 발생했습니다.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 비디오 영역 */}
          <div className="md:col-span-2">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black bg-opacity-50 px-3 py-1 rounded-full">
                <div className={`w-3 h-3 rounded-full ${isInterviewActive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-sm font-medium">
                  {isInterviewActive ? formatTime(currentTime) : '대기 중'}
                </span>
              </div>
            </div>
          </div>

          {/* 질문 & 제어 */}
          <div className="space-y-6">
            {!isInterviewActive ? (
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">면접 준비</h2>
                <p className="text-gray-400 mb-6">카메라와 마이크가 정상 작동하는지 확인 후 시작하세요.</p>
                <Button onClick={handleStartInterview} className="w-full" size="lg">
                  면접 시작하기
                </Button>
              </div>
            ) : (
              <>               
                <div className="bg-gray-800 p-6 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">현재 질문</h3>
                    <span className="text-sm text-gray-400">
                      {currentQuestion.type === 'technical' ? '기술' : '행동'} · {currentQuestion.difficulty === 'easy' ? '초급' : currentQuestion.difficulty === 'medium' ? '중급' : '고급'}
                    </span>
                  </div>
                  <p className="text-gray-300">{currentQuestion.text}</p>
                </div>
                {nextQuestion && (
                  <div className="bg-gray-800 p-6 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">다음 질문</h3>
                      <span className="text-sm text-gray-400">
                        {nextQuestion.type === 'technical' ? '기술' : '행동'} · {nextQuestion.difficulty === 'easy' ? '초급' : nextQuestion.difficulty === 'medium' ? '중급' : '고급'}
                      </span>
                    </div>
                    <p className="text-gray-300">{nextQuestion.text}</p>
                  </div>
                )}
                <div className="flex space-x-4">
                  <Button variant="outline" className="flex-1" onClick={handleNextQuestion} disabled={!nextQuestion}>
                    다음 질문
                  </Button>
                  <Button variant="secondary" className="flex-1" onClick={handleEndInterview}>
                    면접 종료
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 피드백 생성 모달 */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center space-y-4 max-w-xs mx-4">
            <h3 className="text-xl font-semibold text-gray-900">면접이 종료되었습니다.</h3>
            <p className="text-gray-600">피드백을 생성 중입니다...</p>
            <div className="mt-4">
              <svg className="mx-auto w-12 h-12 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">  
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
            <p className="text-gray-500 text-sm">(잠시만 기다려주세요)</p>
          </div>
        </div>
      )}
    </div>
  );
};