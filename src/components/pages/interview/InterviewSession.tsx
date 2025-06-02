// src/components/pages/interview/InterviewSession.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/Button';
import { usePostureTracking } from '../../../hooks/usePostureTracking';

interface Question {
  id: string;
  text: string;
  type: 'technical' | 'behavioral';
  difficulty: 'easy' | 'medium' | 'hard';
}

// 환경변수
const WS_URL = import.meta.env.VITE_WS_URL;                 // ex: ws://localhost:8001/ws/transcribe
const API_BASE = import.meta.env.VITE_API_BASE_URL;         // ex: http://localhost:8000/api
const MAX_ANSWER_DURATION = 90;                             // 초 단위
const TOTAL_INTERVIEW_TIME = 30 * 60;                        // 전체 면접 제한 시간(초)

export const InterviewSession: React.FC = () => {
  const navigate = useNavigate();

  // 비디오 + 자세 추적용 ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const badPostureCountRef = usePostureTracking(videoRef);

  // 면접 전체 상태
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const interviewTimerRef = useRef<number | null>(null);

  // 질문 목록 & 현재 인덱스
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIdx, setQIdx] = useState(0);

  // 녹음·STT 상태
  const [recordTime, setRecordTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(''); // 내부 로깅용

  const recordTimerRef = useRef<number | null>(null);
  const autoStopTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const websocketRef = useRef<WebSocket | null>(null);

  // 전체 로딩 상태
  const [isLoading, setIsLoading] = useState(false);

  /**
   * (1) 카메라 + 포즈 추적 연결
   */
  useEffect(() => {
    async function startCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        // 환경이 맞지 않으면 별도 페이지로 리다이렉트
        navigate('/interview/check-environment');
      }
    }
    startCam();

    return () => {
      // 언마운트 시 스트림 정리
      const tracks = (videoRef.current?.srcObject as MediaStream | null)?.getTracks() || [];
      tracks.forEach((t) => t.stop());
      if (interviewTimerRef.current) {
        clearInterval(interviewTimerRef.current);
      }
    };
  }, [navigate]);

  /**
   * (2) 면접 전체 타이머
   */
  useEffect(() => {
    if (!isInterviewActive) return;
    interviewTimerRef.current = window.setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= TOTAL_INTERVIEW_TIME) {
          onEnd(); // 제한 시간 초과 시 자동 종료
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (interviewTimerRef.current) {
        clearInterval(interviewTimerRef.current);
      }
    };
  }, [isInterviewActive]);

  /**
   * 초 → "MM:SS" 포맷 변환
   */
  const fmt = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  /**
   * (3) 면접 시작 → 질문 생성 호출
   */
  const onStart = async () => {
    console.log('▶︎ API_BASE_URL:', API_BASE);
    console.log('▶︎ WS_URL:', WS_URL);

    const token = localStorage.getItem('id_token') || localStorage.getItem('access_token');
    if (!token) {
      alert('로그인이 필요합니다.');
      return;
    }
    setIsLoading(true);

    try {
      // 실제 백엔드에 매핑된 엔드포인트: "/api/generate-resume-questions/"
      const url = `${API_BASE}/generate-resume-questions/`;
      console.log('▶︎ fetch questions from →', url);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('▶︎ generate-resume-questions status:', res.status);

      if (!res.ok) {
        console.error('▶︎ Error response:', await res.text());
        throw new Error(`Status ${res.status}`);
      }

      // 백엔드에서 반환한 questions: [{ id, text }, ...]
      const { questions: qs }: { questions: { id: string; text: string }[] } = await res.json();
      const mapped = qs.map(({ id, text }) => ({
        id,
        text,
        type: 'behavioral' as const,  // 임시로 모두 behavioral
        difficulty: 'medium' as const, // 임시로 모두 중급
      }));

      setQuestions(mapped);
      setQIdx(0);
      setIsInterviewActive(true);

      // 첫 질문부터 바로 답변 녹음·전사 시작
      startAnswerForQuestion(0);
    } catch (err) {
      console.error(err);
      alert('질문 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * (4) 해당 질문 인덱스(questionIndex)로 답변 녹음 + STT 시작
   */
  const startAnswerForQuestion = async (questionIndex: number) => {
    setTranscript('');
    setRecordTime(0);
    setIsRecording(true);
    audioChunksRef.current = [];

    // ① WebSocket 연결
    websocketRef.current = new WebSocket(WS_URL);
    websocketRef.current.binaryType = 'arraybuffer';

    websocketRef.current.onopen = () => {
      // 마이크 스트림 → PCM으로 변환 → WebSocket으로 전송
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const audioCtx = new AudioContext({ sampleRate: 44100 });
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(audioCtx.destination);

        processor.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          const pcm = floatTo16BitPCM(input);
          if (websocketRef.current?.readyState === WebSocket.OPEN) {
            websocketRef.current.send(pcm);
          }
        };

        // MediaRecorder로 녹음 시작(Blob 수집용)
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (ev) => {
          audioChunksRef.current.push(ev.data);
        };
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
      });
    };

    websocketRef.current.onmessage = (event) => {
      // 서버로부터 JSON { transcript: "..." } 형태로 응답
      const data = JSON.parse(event.data as string);
      const { transcript: t } = data;
      // 텍스트를 화면에 표시하지 않으려면 아래 줄을 주석 처리해도 됩니다.
      // setTranscript((prev) => prev + t + ' ');
      setTranscript((prev) => prev + t + ' ');
    };

    websocketRef.current.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    // ② 90초 제한 타이머
    recordTimerRef.current = window.setInterval(() => {
      setRecordTime((prev) => {
        if (prev + 1 >= MAX_ANSWER_DURATION) {
          onNext(); // 자동으로 다음 질문으로
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    autoStopTimerRef.current = window.setTimeout(() => {
      onNext(); // 90초 후 자동 다음
    }, MAX_ANSWER_DURATION * 1000);
  };

  /**
   * Float32Array → 16-bit PCM(ArrayBuffer) 변환
   */
  function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  /**
   * (5) 녹음·전사 중지 + 백엔드에 업로드
   */
  const stopAndUpload = async (questionId: string, answerText: string) => {
    // 타이머 해제
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);

    // WebSocket 닫기
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.close();
    }
    // MediaRecorder 중지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Blob으로 저장된 audio 데이터를 하나로 합쳐서 WebM 오디오 파일 생성
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

    // FormData에 담아서 백엔드로 전송(“upload” 엔드포인트)
    const form = new FormData();
    form.append('audio', audioBlob, `question_${questionId}.webm`);
    form.append('transcript', answerText);

    const token = localStorage.getItem('id_token') || localStorage.getItem('access_token');
    if (!token) {
      console.error('No auth token');
      return;
    }
    try {
      await fetch(`${API_BASE}/upload/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });
    } catch (e) {
      console.error('Upload failed:', e);
    }

    // 상태 초기화
    audioChunksRef.current = [];
    setTranscript('');
    setIsRecording(false);
    setRecordTime(0);
  };

  /**
   * (6) [다음 질문] 또는 마지막일 경우 [면접 종료]
   */
  const onNext = async () => {
    const currentQuestion = questions[qIdx];
    await stopAndUpload(currentQuestion.id, transcript.trim());

    if (qIdx < questions.length - 1) {
      // 다음 질문 인덱스 설정 및 녹음 재시작
      setQIdx((idx) => idx + 1);
      startAnswerForQuestion(qIdx + 1);
    } else {
      // 마지막 질문까지 완료 → 면접 종료 로직
      onEnd();
    }
  };

  /**
   * (7) 면접 종료
   */
  const onEnd = async () => {
    setIsInterviewActive(false);
    if (interviewTimerRef.current) {
      clearInterval(interviewTimerRef.current);
    }
    setIsLoading(true);

    // 아직 녹음 중이라면 한 번 더 업로드
    if (isRecording) {
      await stopAndUpload(questions[qIdx].id, transcript.trim());
    }

    try {
      // 자세 정보 전송
      await fetch(`${API_BASE}/posture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: badPostureCountRef.current }),
      });

      // 피드백 생성 API 호출
      const res = await fetch(`${API_BASE}/interview/feedback/generate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'CURRENT_SESSION_ID' }),
      });
      if (!res.ok) throw new Error('Feedback 생성 실패');
      const { feedbackId } = await res.json();
      // 피드백 페이지로 이동
      navigate(`/interview/feedback/${feedbackId}`);
    } catch (err) {
      console.error(err);
      alert('면접 종료 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pt-[92px] relative min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 비디오 + 자세 */}
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
              <div
                className={`w-3 h-3 rounded-full ${
                  isInterviewActive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'
                }`}
              />
              <span className="text-sm font-medium">
                {isInterviewActive ? fmt(currentTime) : '대기 중'}
              </span>
            </div>
          </div>
        </div>

        {/* 질문 & 컨트롤 */}
        <div className="space-y-6">
          {!isInterviewActive ? (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">면접 준비</h2>
              <p className="text-gray-400 mb-6">이력서 기반 질문을 생성하고 준비합니다.</p>
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
                    {questions[qIdx]?.type === 'technical' ? '기술' : '행동'}·
                    {questions[qIdx]?.difficulty === 'easy'
                      ? '초급'
                      : questions[qIdx]?.difficulty === 'medium'
                      ? '중급'
                      : '고급'}
                  </span>
                </div>
                <p className="text-gray-300">{questions[qIdx]?.text}</p>
                <p className="mt-4 text-sm text-gray-400">
                  남은 답변 시간: {fmt(MAX_ANSWER_DURATION - recordTime)}
                </p>
                {/* 실시간 전사 텍스트는 화면에 표시하지 않음 */}
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
            <svg
              className="mx-auto w-12 h-12 animate-spin text-primary"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
