// src/components/pages/interview/InterviewSession.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../shared/Button";
import { usePostureTracking } from "../../../hooks/usePostureTracking";

interface Question {
  id: string;
  text: string;
  type: "technical" | "behavioral";
  difficulty: "easy" | "medium" | "hard";
}

// ───────────────────────────────────────────────────────────
// 환경변수: Vite .env 파일에서 읽어옵니다 (반드시 VITE_ 접두사)
// ───────────────────────────────────────────────────────────
const WS_HOST = import.meta.env.VITE_WS_HOST;       // "ws://localhost:8001/ws/transcribe"
const API_BASE = import.meta.env.VITE_API_BASE_URL; // "http://localhost:8000/api"
const MAX_ANSWER_DURATION = 90;   // 90초
const TOTAL_INTERVIEW_TIME = 30 * 60; // 30분

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

  // 녹음 · STT 상태
  const [recordTime, setRecordTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(""); // 실시간 전사 텍스트

  const recordTimerRef = useRef<number | null>(null);
  const autoStopTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const websocketRef = useRef<WebSocket | null>(null);

  // 전체 로딩 상태
  const [isLoading, setIsLoading] = useState(false);

  // (1) 카메라 + 포즈 추적 연결
  useEffect(() => {
    async function startCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        // 환경이 맞지 않으면 점검 페이지로 리다이렉트
        navigate("/interview/check-environment");
      }
    }
    startCam();

    return () => {
      // 언마운트 시 스트림 정리
      const tracks =
        (videoRef.current?.srcObject as MediaStream | null)?.getTracks() ||
        [];
      tracks.forEach((t) => t.stop());
      if (interviewTimerRef.current) {
        clearInterval(interviewTimerRef.current);
      }
    };
  }, [navigate]);

  // (2) 면접 전체 타이머: 면접 활성화 시만 실행
  useEffect(() => {
    if (!isInterviewActive) return;
    interviewTimerRef.current = window.setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= TOTAL_INTERVIEW_TIME) {
          onEnd(); // 30분 경과 시 자동 종료
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

  // 초 → "MM:SS" 포맷 변환
  const fmt = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // (3) 면접 시작 → 질문 생성 API 호출
  const onStart = async () => {
    console.log("▶︎ [DEBUG] API_BASE_URL:", API_BASE);
    console.log("▶︎ [DEBUG] WS_HOST:", WS_HOST);

    // JWT 토큰 꺼내기
    const token =
      localStorage.getItem("id_token") || localStorage.getItem("access_token");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    setIsLoading(true);

    try {
      // POST {API_BASE}/generate-resume-questions/
      const url = `${API_BASE}/generate-resume-questions/`;
      console.log("▶︎ [DEBUG] 질문 생성 요청 URL →", url);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      console.log("▶︎ [DEBUG] 질문 생성 응답 상태(status):", res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error("▶︎ [DEBUG] 질문 생성 에러 응답 바디:", errorText);
        throw new Error(`Status ${res.status}`);
      }

      // 백엔드는 string[] 을 반환한다고 가정
      const { questions: qs }: { questions: string[] } = await res.json();
      console.log("▶︎ [DEBUG] questions payload:", qs);

      // string[] → Question[] 형태로 매핑
      const mapped: Question[] = qs.map((text, idx) => ({
        id: `q${idx + 1}`,
        text,
        type: "behavioral",
        difficulty: "medium",
      }));
      console.log("▶︎ [DEBUG] mapped questions:", mapped);

      setQuestions(mapped);
      setQIdx(0);
      setIsInterviewActive(true);

      // (4) 첫 질문부터 STT + 녹음 시작
      startAnswerForQuestion(0);
    } catch (err) {
      console.error("[ERROR] 질문 생성 중 예외 발생 →", err);
      alert("질문 생성에 실패했습니다. 콘솔을 확인해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // (4) 해당 질문(questionIndex)에 대해 녹음 + STT(WebSocket) 시작
  const startAnswerForQuestion = async (questionIndex: number) => {
    setTranscript("");
    setRecordTime(0);
    setIsRecording(true);
    audioChunksRef.current = [];

    // (A) WebSocket 연결: user_email 반드시 붙여야 함
    const storedEmail = localStorage.getItem("user_email") || "anonymous";
    const userId = encodeURIComponent(storedEmail);
    const wsUrlWithId = `${WS_HOST}/${userId}`;
    console.log("▶︎ [DEBUG] WebSocket 연결 시도 →", wsUrlWithId);

    websocketRef.current = new WebSocket(wsUrlWithId);
    websocketRef.current.binaryType = "arraybuffer";

    websocketRef.current.onopen = () => {
      // 마이크 스트림 → PCM → WebSocket 전송
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

        // MediaRecorder로도 Blob을 수집
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (ev) => {
          audioChunksRef.current.push(ev.data);
        };
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
      });
    };

    websocketRef.current.onmessage = (event) => {
      // AWS Transcribe가 전송한 텍스트 조각이 도착
      const data = event.data as string;
      setTranscript((prev) => prev + data + " ");
    };

    websocketRef.current.onerror = (err) => {
      console.error("▶︎ [DEBUG] WebSocket error:", err);
    };

    // (B) 90초 제한 타이머
    recordTimerRef.current = window.setInterval(() => {
      setRecordTime((prev) => {
        if (prev + 1 >= MAX_ANSWER_DURATION) {
          onNext(); // 자동으로 다음 질문으로 넘어감
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    autoStopTimerRef.current = window.setTimeout(() => {
      onNext(); // 90초 초과 시 자동 다음
    }, MAX_ANSWER_DURATION * 1000);
  };

  // Float32Array → 16-bit PCM(ArrayBuffer) 변환
  function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  // (5) 녹음·전사 중지 + 백엔드 업로드 (FastAPI /upload/)
  const stopAndUpload = async (questionId: string, answerText: string) => {
    // 타이머 해제
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);

    // WebSocket 닫기
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.close();
    }
    // MediaRecorder 중지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    // Blob 형태로 수집된 데이터 합치기
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

    // form-data
    const form = new FormData();
    form.append("audio", audioBlob, `question_${questionId}.webm`);
    form.append("transcript", answerText);

    // FastAPI /upload/는 'email' 필드를 Form으로 기대함
    const storedEmail = localStorage.getItem("user_email") || "anonymous";
    form.append("email", storedEmail);

    const token =
      localStorage.getItem("id_token") || localStorage.getItem("access_token");
    if (!token) {
      console.error("▶︎ [DEBUG] No auth token");
      return;
    }

    try {
      // POST ${API_BASE}/upload/
      const res = await fetch(`${API_BASE}/upload/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Content-Type은 form-data가 자동으로 설정하므로 생략합니다.
        },
        body: form,
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("▶︎ [DEBUG] Upload API 에러 →", res.status, text);
      } else {
        console.log(
          "▶︎ [DEBUG] audio & transcript 업로드 성공 → questionId:",
          questionId
        );
      }
    } catch (e) {
      console.error("▶︎ [DEBUG] Upload failed:", e);
    }

    // 상태 초기화
    audioChunksRef.current = [];
    setTranscript("");
    setIsRecording(false);
    setRecordTime(0);
  };

  // (6) [다음 질문 또는 종료]
  const onNext = async () => {
    if (questions.length === 0 || qIdx < 0 || qIdx >= questions.length) {
      console.warn("[onNext] 질문 없음 또는 인덱스 범위 벗어남 →", qIdx, questions);
      return;
    }

    const currentQuestion = questions[qIdx];
    // 질문별 녹음+전사 업로드
    await stopAndUpload(currentQuestion.id, transcript.trim());

    if (qIdx < questions.length - 1) {
      setQIdx((idx) => idx + 1);
      startAnswerForQuestion(qIdx + 1);
    } else {
      // 마지막 질문일 때
      onEnd();
    }
  };

  // (7) 면접 종료: 자세 전송 + 피드백 생성
  const onEnd = async () => {
    setIsInterviewActive(false);
    if (interviewTimerRef.current) {
      clearInterval(interviewTimerRef.current);
    }
    setIsLoading(true);

    // 녹음 중이라면 마지막 업로드
    if (isRecording && questions.length > 0) {
      await stopAndUpload(questions[qIdx].id, transcript.trim());
    }

    try {
      // 1) 자세 정보 전송
      console.log("▶︎ [DEBUG] POST /posture/ →", badPostureCountRef.current);
      await fetch(`${API_BASE}/posture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: badPostureCountRef.current }),
      });

      // 2) 피드백 생성 요청
      console.log("▶︎ [DEBUG] POST /interview/feedback/generate/");
      const res = await fetch(`${API_BASE}/interview/feedback/generate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "CURRENT_SESSION_ID" }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("▶︎ [DEBUG] Feedback 생성 실패 →", text);
        throw new Error("Feedback 생성 실패");
      }
      const { feedbackId } = await res.json();
      navigate(`/interview/feedback/${feedbackId}`);
    } catch (err) {
      console.error("[ERROR] 면접 종료 중 예외 발생 →", err);
      alert("면접 종료 중 오류가 발생했습니다. 콘솔을 확인해 주세요.");
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
                  isInterviewActive ? "bg-red-500 animate-pulse" : "bg-gray-500"
                }`}
              />
              <span className="text-sm font-medium">
                {isInterviewActive ? fmt(currentTime) : "대기 중"}
              </span>
            </div>
          </div>
        </div>

        {/* 질문 & 컨트롤 */}
        <div className="space-y-6">
          {!isInterviewActive ? (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">면접 준비</h2>
              <p className="text-gray-400 mb-6">
                이력서 기반 질문을 생성하고 준비합니다.
              </p>
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
                  {questions.length > 0 && (
                    <span className="text-sm text-gray-400">
                      {questions[qIdx]?.type === "technical" ? "기술" : "행동"}·
                      {questions[qIdx]?.difficulty === "easy"
                        ? "초급"
                        : questions[qIdx]?.difficulty === "medium"
                        ? "중급"
                        : "고급"}
                    </span>
                  )}
                </div>
                {questions.length === 0 ? (
                  <p className="text-gray-300">질문을 불러오는 중…</p>
                ) : (
                  <p className="text-gray-300">{questions[qIdx]?.text}</p>
                )}
                {questions.length > 0 && (
                  <p className="mt-4 text-sm text-gray-400">
                    남은 답변 시간: {fmt(MAX_ANSWER_DURATION - recordTime)}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={onNext}
                disabled={isLoading || questions.length === 0}
              >
                {qIdx < questions.length - 1 ? "다음 질문" : "면접 종료"}
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
