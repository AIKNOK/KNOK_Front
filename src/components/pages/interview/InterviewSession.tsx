import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../shared/Button";
import { usePostureTracking } from "../../../hooks/usePostureTracking";
import { encodeWAV } from "../../../utils/encodeWAV";

interface Question {
  id: string;
  text: string;
  type: "technical" | "behavioral";
  difficulty: "easy" | "medium" | "hard";
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const MAX_ANSWER_DURATION = 90; // 초

export const InterviewSession: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 포즈 추적 훅 (videoRef 전달 → 내부에서 얼굴/자세 추적)
  const badPostureCountRef = usePostureTracking(videoRef);

  // 마이크 상태: 연결 여부, 볼륨 레벨
  const [micConnected, setMicConnected] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  // 면접 진행 상태
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [recordTime, setRecordTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(""); // 프론트 테스트용(실제 STT는 백엔드)

  // 녹음 관련 refs
  const audioChunksRef = useRef<Float32Array[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recordTimerRef = useRef<number | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1) 마운트 시: 카메라 + 마이크 연결 & 볼륨 시각화
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let analyser: AnalyserNode;
    let animId: number;
    let mediaStream: MediaStream | null = null;

    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        // 비디오 화면에 스트림 연결
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;
        mediaStream = stream;
        setMicConnected(true);

        // AudioContext / webkitAudioContext 타입 단언
        const AudioCtxClass =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) {
          alert("이 브라우저는 AudioContext를 지원하지 않습니다.");
          return;
        }

        // 샘플레이트를 44100으로 고정 (encodeWAV와 일치시킴)
        const audioCtx = new AudioCtxClass({ sampleRate: 44100 });
        audioContextRef.current = audioCtx;

        // Chrome에서 HTTPS가 아닌 경우 AudioContext가 suspended가 되므로 resume
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
          console.log("▶ AudioContext resumed (마이크 볼륨 시각화 시작)");
        }

        // 볼륨 시각화를 위한 AnalyserNode
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const draw = () => {
          analyser.getByteFrequencyData(dataArray);
          const avg =
            dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
          setMicLevel(Math.min(100, (avg / 255) * 100));
          animId = requestAnimationFrame(draw);
        };
        draw();
      } catch (err) {
        console.error("getUserMedia error:", err);
        setMicConnected(false);
        // 환경 점검 페이지로 강제 이동
        navigate("/interview/check-environment");
      }
    };

    setupMedia();

    return () => {
      // 언마운트 시 정리
      cancelAnimationFrame(animId);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [navigate]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2) "AI 면접 시작하기" 버튼 클릭 → 질문 생성 → 상태 세팅 (isInterviewActive=true)
  // ─────────────────────────────────────────────────────────────────────────────
  const onStart = async () => {
    const token =
      localStorage.getItem("id_token") || localStorage.getItem("access_token");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/generate-resume-questions/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const { questions: qs }: { questions: string[] } = await res.json();

      // Question 타입으로 변환
      const mapped: Question[] = qs.map((text, idx) => ({
        id: `${idx + 1}`,
        text,
        type: "behavioral",
        difficulty: "medium",
      }));
      setQuestions(mapped);
      setQIdx(0);
      setIsInterviewActive(true);
      // → 이제 useEffect에서 녹음이 자동으로 시작된다.
    } catch (err) {
      console.error("질문 생성 실패:", err);
      alert("질문 생성 실패");
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3) isInterviewActive 또는 qIdx 변경 시 → 녹음 자동 시작
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isInterviewActive) return;
    console.log("▶ 면접이 시작되었습니다. 현재 질문 인덱스:", qIdx);

    startRecording();
    // ! 주의: qIdx가 바뀔 때마다 이전 핸들러들이 제대로 정리되는지 확인할 것
    // 즉, stopRecordingAndUpload() 안에서 clearInterval, disconnect, close를 제대로 했는지 체크
    // 여기서는 의도적으로 startRecording()만 호출
  }, [isInterviewActive, qIdx]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4) 녹음 시작 → AudioContext 생성 → ScriptProcessorNode로 샘플 수집
  // ─────────────────────────────────────────────────────────────────────────────
  const startRecording = () => {
    if (!questions[qIdx] || !streamRef.current) {
      console.warn("startRecording: 질문이 없거나 streamRef.current가 null입니다.");
      return;
    }
    console.log("▶ startRecording() 호출됨, question:", qIdx + 1);

    setRecordTime(0);
    setIsRecording(true);
    audioChunksRef.current = [];

    // AudioContext / webkitAudioContext 단언
    const AudioCtxClass =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) {
      alert("이 브라우저는 AudioContext를 지원하지 않습니다.");
      return;
    }

    // 샘플레이트 44100 고정
    const audioCtx = new AudioCtxClass({ sampleRate: 44100 });
    audioContextRef.current = audioCtx;

    // Chrome에서 HTTPS가 아닌 환경에서는 suspended 상태가 될 수 있으므로 resume
    if (audioCtx.state === "suspended") {
      audioCtx.resume().then(() => {
        console.log("▶ AudioContext resumed (녹음 시작)");
      });
    }

    const source = audioCtx.createMediaStreamSource(streamRef.current);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    source.connect(processor);
    processor.connect(audioCtx.destination);

    // AudioProcessingEvent 타입으로 정확히 선언
    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      /*console.log(
        "▶ onaudioprocess 이벤트 발생, 버퍼 길이:",
        e.inputBuffer.getChannelData(0).length
      );*/
      const floatData = new Float32Array(e.inputBuffer.getChannelData(0));
      audioChunksRef.current.push(floatData);
    };

    // 녹음 타이머: 1초마다 recordTime 증가, 90초 채워지면 자동 stop
    recordTimerRef.current = window.setInterval(() => {
      setRecordTime((prev) => {
        if (prev + 1 >= MAX_ANSWER_DURATION) {
          console.log("▶ 녹음 최대 시간(90초) 도달, 자동으로 stopRecordingAndUpload()");
          stopRecordingAndUpload();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    console.log("▶ recordTimerRef.current set to", recordTimerRef.current);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5) 녹음 중지 → 샘플 합쳐서 WAV로 변환 → 서버 업로드 → 질문 변경 or 면접 종료
  // ─────────────────────────────────────────────────────────────────────────────
  const stopRecordingAndUpload = async () => {
    console.log("▶ stopRecordingAndUpload() 호출됨, 현재 질문:", qIdx + 1);
    setIsRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      console.log("▶ recordTimer cleared");
    }
    processorRef.current?.disconnect();
    audioContextRef.current?.close();

    // 5-1) Float32Array를 하나로 병합
    const allSamples = audioChunksRef.current.reduce((acc, cur) => {
      const tmp = new Float32Array(acc.length + cur.length);
      tmp.set(acc, 0);
      tmp.set(cur, acc.length);
      return tmp;
    }, new Float32Array());
    console.log("▶ allSamples length:", allSamples.length);

    // 5-2) WAV Blob으로 인코딩 (샘플레이트 44100)
    const wavBlob = encodeWAV(allSamples, 44100);
    console.log("▶ wavBlob 생성 완료, size (bytes):", wavBlob.size);

    // 5-3) FormData 생성 → 백엔드에 업로드
    const formData = new FormData();
    formData.append("audio", wavBlob, `question_${questions[qIdx].id}.wav`);
    formData.append("transcript", transcript); // 실제 STT는 백엔드에서 처리
    formData.append("email", localStorage.getItem("user_email") || "anonymous");
    formData.append("question_id", questions[qIdx].id);

    const token =
      localStorage.getItem("id_token") || localStorage.getItem("access_token");
    try {
      const uploadRes = await fetch(`${API_BASE}/audio/upload/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      console.log("▶ 오디오 업로드 응답 상태:", uploadRes.status);
    } catch (err) {
      console.error("녹음 업로드 실패:", err);
      alert("녹음 업로드 실패");
    }

    // 5-4) 다음 질문 또는 면접 종료
    if (qIdx < questions.length - 1) {
      console.log("▶ 다음 질문으로 넘어갑니다:", qIdx + 2);
      setQIdx((prev) => prev + 1);
      setTranscript(""); // 백엔드가 STT 처리 → 프론트는 비워둠
      // → useEffect가 qIdx 변화를 감지하여 startRecording()을 다시 호출함
    } else {
      console.log("▶ 마지막 질문, 면접 종료 처리");
      setIsInterviewActive(false);

      // 자세 카운트 전송
      try {
        const postureRes = await fetch(`${API_BASE}/posture/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: badPostureCountRef.current }),
        });
        console.log("▶ 자세 카운트 전송 응답 상태:", postureRes.status);
      } catch (err) {
        console.error("자세 카운트 전송 실패:", err);
      }

      // 피드백 페이지로 이동 (필요 시 feedbackId를 URL에 붙여 주세요)
      navigate("/interview/feedback");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 6) 수동으로 “다음 질문” 또는 “면접 종료” 버튼 클릭 시
  // ─────────────────────────────────────────────────────────────────────────────
  const handleNext = async () => {
    console.log("▶ handleNext() 호출됨, isRecording:", isRecording);
    if (isRecording) {
      console.log("▶ stopRecordingAndUpload() 호출 전");
      await stopRecordingAndUpload();
      console.log("▶ stopRecordingAndUpload() 호출 완료");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 7) UI 렌더링
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="pt-[92px] relative min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* ┌ 비디오 + 자세 영역 ────────────────────────────── */}
        <div className="md:col-span-2">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {/* 마이크 연결 상태 & 볼륨 게이지 */}
            <div className="absolute top-4 left-4 flex flex-col items-start space-y-2 bg-black bg-opacity-50 px-3 py-2 rounded-lg">
              <div>
                <span className="text-xs mr-2">마이크 상태:</span>
                <span className={micConnected ? "text-green-400" : "text-red-400"}>
                  {micConnected ? "연결됨" : "미연결"}
                </span>
              </div>
              <div className="w-32 h-2 bg-gray-600 rounded overflow-hidden">
                <div
                  className="h-full bg-green-400"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ┌ 질문 & 컨트롤 영역 ────────────────────────────── */}
        <div className="space-y-6">
          {!isInterviewActive ? (
            // 면접 시작 전 화면
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">면접 준비</h2>
              <p className="text-gray-400 mb-6">
                이력서 기반 질문을 생성하고 녹음을 준비합니다.
              </p>
              <Button
                onClick={onStart}
                className="w-full"
                size="lg"
                disabled={isLoading || !micConnected}
                isLoading={isLoading}
              >
                AI 면접 시작하기
              </Button>
            </div>
          ) : (
            // 면접 중 화면
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">현재 질문</h3>
                <span className="text-sm text-gray-400">
                  {qIdx + 1}/{questions.length}
                </span>
              </div>
              <p className="text-gray-300">{questions[qIdx]?.text}</p>
              <p className="mt-4 text-sm text-gray-400">
                남은 답변 시간: {MAX_ANSWER_DURATION - recordTime}초
              </p>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={handleNext}
                disabled={isLoading}
              >
                {qIdx < questions.length - 1 ? "다음 질문" : "면접 종료"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ┌ 로딩 모달 ─────────────────────────────────────── */}
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
