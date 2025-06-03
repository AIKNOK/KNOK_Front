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

const WS_HOST = import.meta.env.VITE_WS_HOST;
const API_BASE = import.meta.env.VITE_API_BASE_URL;
const MAX_ANSWER_DURATION = 90;
const TOTAL_INTERVIEW_TIME = 30 * 60;

export const InterviewSession: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const badPostureCountRef = usePostureTracking(videoRef);

  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const interviewTimerRef = useRef<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [recordTime, setRecordTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recordTimerRef = useRef<number | null>(null);
  const autoStopTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const websocketRef = useRef<WebSocket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const uploadLockRef = useRef(false);

  const stopAndUpload = async (questionId: string, answerText: string) => {
    const email = localStorage.getItem("user_email");
    const token =
      localStorage.getItem("id_token") || localStorage.getItem("access_token");

    if (!email || !token) {
      console.error("❌ 이메일 또는 토큰 없음!");
      return;
    }

    console.log("🎙️ 업로드 시작 - 질문 ID:", questionId);
    console.log("📄 전사 내용:", answerText);

    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const audioFile = new File([blob], `${questionId}.webm`);

    const form = new FormData();
    form.append("email", email);
    form.append("question_id", questionId);
    form.append("transcript", answerText);
    form.append("audio", audioFile);

    try {
      const res = await fetch(`${API_BASE}/audio/upload/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (res.ok) {
        console.log("✅ 업로드 성공!");
      } else {
        const text = await res.text();
        console.error("❌ 업로드 실패:", res.status, text);
      }
    } catch (err) {
      console.error("❌ 업로드 중 오류:", err);
    }
  };

  useEffect(() => {
    async function startCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        console.log("🎥 카메라 스트림 연결 성공!");
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        } else {
          console.warn("⚠️ videoRef.current가 null입니다.");
        }
      } catch (err) {
        console.error("❌ 카메라 연결 실패:", err);
        navigate("/interview/check-environment");
      }
    }

    startCam();
    return () => {
      const tracks =
        (videoRef.current?.srcObject as MediaStream | null)?.getTracks() || [];
      tracks.forEach((t) => t.stop());
      if (interviewTimerRef.current) clearInterval(interviewTimerRef.current);
    };
  }, [navigate]);

  useEffect(() => {
    if (!isInterviewActive) return;
    interviewTimerRef.current = window.setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= TOTAL_INTERVIEW_TIME) {
          onEnd();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    return () => {
      if (interviewTimerRef.current) clearInterval(interviewTimerRef.current);
    };
  }, [isInterviewActive]);

  const fmt = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const onStart = async () => {
    const token =
      localStorage.getItem("id_token") || localStorage.getItem("access_token");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    setIsLoading(true);
    try {
      const url = `${API_BASE}/generate-resume-questions/`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(await res.text());
      const { questions: qs }: { questions: string[] } = await res.json();
      const mapped: Question[] = qs.map((text, idx) => ({
        id: `q${idx + 1}`,
        text,
        type: "behavioral",
        difficulty: "medium",
      }));
      setQuestions(mapped);
      setQIdx(0);
      setIsInterviewActive(true);
      startAnswerForQuestion(0);
    } catch (err) {
      console.error("질문 생성 실패:", err);
      alert("질문 생성 실패");
    } finally {
      setIsLoading(false);
    }
  };

  const startAnswerForQuestion = async (questionIndex: number) => {
    if (
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN
    ) {
      websocketRef.current.close();
    }

    setTranscript("");
    setRecordTime(0);
    setIsRecording(true);
    audioChunksRef.current = [];
    const storedEmail = localStorage.getItem("user_email") || "anonymous";
    const wsUrlWithId = `${WS_HOST}?email=${encodeURIComponent(storedEmail)}`;

    websocketRef.current = new WebSocket(wsUrlWithId);
    websocketRef.current.binaryType = "arraybuffer";

    websocketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.transcript) {
          console.log("📝 전사 수신:", data.transcript);
          setTranscript((prev) => prev + " " + data.transcript);
        }
      } catch (err) {
        console.error("❌ WebSocket 메시지 파싱 실패:", err);
      }
    };

    websocketRef.current.onopen = () => {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const audioCtx = new AudioContext({ sampleRate: 16000 });
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
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (ev) => {
          audioChunksRef.current.push(ev.data);
        };
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
      });
    };

    recordTimerRef.current = window.setInterval(() => {
      setRecordTime((prev) => {
        if (prev + 1 >= MAX_ANSWER_DURATION) {
          onNext();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    autoStopTimerRef.current = window.setTimeout(
      () => onNext(),
      MAX_ANSWER_DURATION * 1000
    );
  };

  const floatTo16BitPCM = (input: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  const onNext = async () => {
    if (questions.length === 0 || qIdx < 0 || qIdx >= questions.length) return;

    console.log("🛑 업로드 직전 transcript:", transcript);
    await stopAndUpload(questions[qIdx].id, transcript.trim());

    if (qIdx < questions.length - 1) {
      setQIdx((idx) => idx + 1);
      await new Promise((r) => setTimeout(r, 300));
      startAnswerForQuestion(qIdx + 1);
    } else {
      onEnd();
    }
  };

  const onEnd = async () => {
    setIsInterviewActive(false);
    if (interviewTimerRef.current) clearInterval(interviewTimerRef.current);
    setIsLoading(true);
    if (isRecording && questions.length > 0) {
      console.log("🛑 최종 transcript (onEnd):", transcript);
      await stopAndUpload(questions[qIdx].id, transcript.trim());
    }
    try {
      await fetch(`${API_BASE}/posture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: badPostureCountRef.current }),
      });
      const res = await fetch(`${API_BASE}/interview/feedback/generate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "CURRENT_SESSION_ID" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { feedbackId } = await res.json();
      navigate(`/interview/feedback/${feedbackId}`);
    } catch (err) {
      console.error("면접 종료 실패:", err);
      alert("면접 종료 오류");
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
