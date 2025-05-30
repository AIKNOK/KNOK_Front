// src/components/pages/interview/InterviewSession.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/Button';
import { usePostureTracking } from '../../../hooks/usePostureTracking';

interface Question {
  text: string;
  type: 'technical' | 'behavioral';
  difficulty: 'easy' | 'medium' | 'hard';
}

export const InterviewSession: React.FC = () => {
  const navigate = useNavigate();

  // 비디오 + 자세 카운팅
  const videoRef = useRef<HTMLVideoElement>(null);
  const badPostureCountRef = usePostureTracking(videoRef);

  // 면접 상태
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const totalTime = 30 * 60;
  const timerRef = useRef<number | null>(null);

  // 질문 로딩 / 진행
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIdx, setQIdx] = useState(0);

  // 요청 중 로딩
  const [isLoading, setIsLoading] = useState(false);

  // 1) 카메라/마이크
  useEffect(() => {
    async function startCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        navigate('/interview/check-environment');
      }
    }
    startCam();
    return () => {
      (videoRef.current?.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [navigate]);

  // 2) 타이머
  useEffect(() => {
    if (!isInterviewActive) return;
    timerRef.current = window.setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= totalTime) {
          onEnd();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    return () => void (timerRef.current && clearInterval(timerRef.current));
  }, [isInterviewActive]);

  // 시간 포맷
  const fmt = (sec: number) => {
    const m = String(Math.floor(sec/60)).padStart(2,'0');
    const s = String(sec%60).padStart(2,'0');
    return `${m}:${s}`;
  };

  // 3) 면접 시작 → 질문 3개 받아오기
  const onStart = async () => {
    const token = localStorage.getItem('id_token') || localStorage.getItem('access_token');
    if (!token) return alert('로그인이 필요합니다.');
    setIsLoading(true);
    try {
      const res = await fetch('/api/generate-questions/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error();
      const { questions: qs }: { questions: string[] } = await res.json();
      // 예시로 모두 behavioral·medium 으로 세팅
      setQuestions(qs.map(text => ({
        text,
        type: 'behavioral',
        difficulty: 'medium'
      })));
      setQIdx(0);
      setIsInterviewActive(true);
    } catch {
      alert('질문 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4) 다음 질문 or 종료
  const onNext = () => {
    if (qIdx < questions.length - 1) {
      setQIdx(qIdx + 1);
    } else {
      onEnd();
    }
  };

  // 5) 면접 종료 → 자세 전송 + 피드백
  const onEnd = async () => {
    setIsInterviewActive(false);
    timerRef.current && clearInterval(timerRef.current);
    setIsLoading(true);
    try {
      await fetch('/api/posture/', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ count: badPostureCountRef.current })
      });
      const res = await fetch('/api/interview/feedback/generate', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ sessionId: 'CURRENT_SESSION_ID' })
      });
      if (!res.ok) throw new Error();
      const { feedbackId } = await res.json();
      navigate(`/interview/feedback/${feedbackId}`);
    } catch {
      alert('면접 종료 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pt-[92px] relative min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 비디오 */}
        <div className="md:col-span-2">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"/>
            <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black bg-opacity-50 px-3 py-1 rounded-full">
              <div className={`w-3 h-3 rounded-full ${isInterviewActive?'bg-red-500 animate-pulse':'bg-gray-500'}`}/>
              <span className="text-sm font-medium">{isInterviewActive?fmt(currentTime):'대기 중'}</span>
            </div>
          </div>
        </div>

        {/* 질문 & 컨트롤 */}
        <div className="space-y-6">
          {!isInterviewActive ? (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">면접 준비</h2>
              <p className="text-gray-400 mb-6">질문을 생성하고 준비합니다.</p>
              <Button
                onClick={onStart}
                className="w-full"
                size="lg"
                disabled={isLoading}
                isLoading={isLoading}
              >
                AI 면접 시작하기
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">현재 질문</h3>
                  <span className="text-sm text-gray-400">
                    {questions[qIdx].type==='technical'?'기술':'행동'}·
                    {questions[qIdx].difficulty==='easy'?'초급':questions[qIdx].difficulty==='medium'?'중급':'고급'}
                  </span>
                </div>
                <p className="text-gray-300">{questions[qIdx].text}</p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={onNext}
                disabled={isLoading}
              >
                {qIdx < questions.length - 1 ? '다음 질문' : '면접 종료'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 로딩 모달 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center max-w-xs mx-4 space-y-4">
            <h3 className="text-gray-900 text-lg font-semibold">처리 중...</h3>
            <svg className="mx-auto w-12 h-12 animate-spin text-primary" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
