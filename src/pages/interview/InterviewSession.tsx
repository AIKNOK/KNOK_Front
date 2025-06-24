import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/shared/Button";
import { usePostureTracking, resetPostureBaseline } from "../../hooks/usePostureTracking";
import { encodeWAV } from "../../utils/encodeWAV";

interface Question {
  id: string;
  text: string;
  type: string;
  difficulty: string;
  audio_url?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const MAX_ANSWER_DURATION = 90;
const userEmail = localStorage.getItem("user_email") || "anonymous";
const videoId = `interview_${userEmail}_${Date.now()}`;
const S3_BASE_URL = "https://knok-tts.s3.ap-northeast-2.amazonaws.com/";

export const InterviewSession = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const resumeRef = useRef<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const questionVideoChunksRef = useRef<Blob[]>([]);
  const questionOffsetRef = useRef<number>(0);
  const [micConnected, setMicConnected] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [recordTime, setRecordTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<"쉬움" | "중간" | "어려움">("중간");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const transcriptRef = useRef<string>("");
  const interviewStartRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(0);
  const [questionOffset, setQuestionOffset] = useState(0);

  const { countsRef, segmentsRef } = usePostureTracking(videoRef, videoId, questionOffset);

  const convertFloat32ToInt16 = (buffer: Float32Array): Uint8Array => {
    const result = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return new Uint8Array(result.buffer);
  };

  // 초기 미디어 설정 (카메라, 마이크 레벨 측정)
  useEffect(() => {
    setRecordTime(0);
    let analyser: AnalyserNode;
    let animId: number;
    let mediaStream: MediaStream | null = null;

    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: { channelCount: 1, sampleRate: 16000, sampleSize: 16 },
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
        streamRef.current = stream;
        mediaStream = stream;
        setMicConnected(true);

        const AudioCtx =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return alert("AudioContext 미지원");
        const audioCtx = new AudioCtx({ sampleRate: 16000 });
        audioContextRef.current = audioCtx;
        if (audioCtx.state === "suspended") await audioCtx.resume();

        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const draw = () => {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
          setMicLevel(Math.min(100, (avg / 255) * 100));
          animId = requestAnimationFrame(draw);
        };
        draw();
      } catch (err) {
        console.error("getUserMedia error:", err);
        navigate("/interview/check-environment");
      }
    };

    setupMedia();
    return () => {
      cancelAnimationFrame(animId);
      audioContextRef.current?.close();
      mediaStream?.getTracks().forEach((t) => t.stop());
    };
  }, [navigate]);

  // 면접 시작 핸들러
  const onStart = async () => {
    const token =
      localStorage.getItem("id_token") || localStorage.getItem("access_token");
    if (!token) return alert("로그인이 필요합니다.");
    setIsLoading(true);
    try {
      // 질문 생성 API 호출
      const generateRes = await fetch(
        `${API_BASE}/generate-resume-questions/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ difficulty }),
        }
      );
      if (!generateRes.ok) {
        const errorText = await generateRes.text();
        throw new Error(`질문 생성 실패: ${errorText}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 질문 목록 가져오기
      const qRes = await fetch(`${API_BASE}/get_all_questions`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!qRes.ok) throw new Error(await qRes.text());
      const { questions: questionMap } = await qRes.json();

      const email = userEmail.split("@")[0];
      const filteredQuestionList = (Object.entries(
        questionMap
      ) as [string, string][])
        .map(([id, text]) => ({
          id,
          text,
          type: "behavioral",
          difficulty: "medium",
          audio_url: `${S3_BASE_URL}${email}/${id}.wav`,
        }));

      // '자기소개' 문항은 맨 앞으로
      const sortedQuestionList = [...filteredQuestionList].sort((a, b) => {
        if (a.text.includes("자기소개")) return -1;
        if (b.text.includes("자기소개")) return 1;
        const getNumericId = (id: string) => {
          const match = id.match(/\d+/);
          return match ? parseInt(match[0]) : Number.MAX_SAFE_INTEGER;
        };
        return getNumericId(a.id) - getNumericId(b.id);
      });

      setQuestions(sortedQuestionList);

      // 이력서 텍스트 받아오기
      try {
        const rRes = await fetch(`${API_BASE}/get-resume-text/`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (rRes.ok) {
          const { resume_text } = await rRes.json();
          setResumeText(resume_text || "");
          resumeRef.current = resume_text || "";
        }
      } catch {}

      // 면접 상태 초기화
      setQIdx(0);
      setIsInterviewActive(true);
      interviewStartRef.current = Date.now();

      // 비디오 녹화 시작
      if (streamRef.current) {
        questionVideoChunksRef.current = [];
        const recorder = new MediaRecorder(streamRef.current, {
          mimeType: "video/webm",
        });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) questionVideoChunksRef.current.push(e.data);
        };
        recorder.start();
        questionStartTimeRef.current = Date.now();
        questionOffsetRef.current = 0;
        mediaRecorderRef.current = recorder;
      }
    } catch (err) {
      console.error("면접 시작 실패:", err);
      alert("면접 시작 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 추가 질문 여부 결정
  const decideFollowup = async (
    userAnswer: string,
    questionIndex: number
  ): Promise<boolean> => {
    const token =
      localStorage.getItem("id_token") || localStorage.getItem("access_token");
    if (!token || !resumeRef.current) return false;
    const payload = {
      resume_text: resumeRef.current,
      user_answer: userAnswer.trim(),
      base_question_number:
        parseInt(questions[questionIndex].id.match(/\d+/)?.[0] || "0", 10) || 0,
      interview_id: videoId,
      existing_question_numbers: questions.map((q) => q.id),
    };
    const res = await fetch(`${API_BASE}/followup/check/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.followup && data.question && data.question_number) {
      setQuestions((prev) => {
        const updated = [
          ...prev.slice(0, questionIndex + 1),
          {
            id: data.question_number,
            text: data.question,
            type: "behavioral",
            difficulty: "medium",
            audio_url: data.audio_url,
          },
          ...prev.slice(questionIndex + 1),
        ];
        setQIdx(questionIndex + 1);
        return updated;
      });
      return true;
    }
    return false;
  };

  // 질문 전환 시 오디오 재생
  useEffect(() => {
    if (isInterviewActive && questions[qIdx]) {
      playQuestionAudio();
    }
  }, [isInterviewActive, qIdx, questions]);

  const playQuestionAudio = async () => {
    if (!questions[qIdx]) return;
    setIsPlayingAudio(true);
    if (audioRef.current) audioRef.current.pause();
    if (questions[qIdx].audio_url) {
      try {
        const response = await fetch(questions[qIdx].audio_url);
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        if (!audioRef.current) {
          audioRef.current = document.createElement("audio");
          document.body.appendChild(audioRef.current);
        }
        audioRef.current.src = blobUrl;
        audioRef.current.onended = () => {
          setIsPlayingAudio(false);
          startRecording();
          URL.revokeObjectURL(blobUrl);
        };
        audioRef.current.onerror = () => {
          setIsPlayingAudio(false);
          startRecording();
          URL.revokeObjectURL(blobUrl);
        };
        await audioRef.current.play();
      } catch {
        setIsPlayingAudio(false);
        startRecording();
      }
    } else {
      setIsPlayingAudio(false);
      startRecording();
    }
  };

  // 답변 녹취 및 WebSocket 전송
  const startRecording = () => {
    if (!questions[qIdx] || !streamRef.current) return;
    segmentsRef.current = [];
    resetPostureBaseline();
    setRecordTime(0);
    setIsRecording(true);
    setIsPreparing(false);

    const token =
      localStorage.getItem("id_token") || localStorage.getItem("access_token");
    const ws = new WebSocket(
      `ws://localhost:8001/ws/transcribe?email=${encodeURIComponent(
        userEmail
      )}&question_id=${questions[qIdx].id}&token=${token}`
    );
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    const audioCtx = audioContextRef.current!;
    let source: MediaStreamAudioSourceNode;
    let processor: ScriptProcessorNode;

    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === "upload_id") {
        setUploadId(data.upload_id);
        return;
      }
      if (data.transcript) {
        setTranscript((prev) => {
          const updated = prev + data.transcript + "\n";
          transcriptRef.current = updated;
          return updated;
        });
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
    };

    ws.onopen = async () => {
      const audioCtx = audioContextRef.current!;
      if (audioCtx.state === "suspended") await audioCtx.resume();
      
      const source = audioCtx.createMediaStreamSource(streamRef.current!);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const floatData = e.inputBuffer.getChannelData(0);
          ws.send(convertFloat32ToInt16(floatData));
          audioChunksRef.current.push(new Float32Array(floatData));
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      processorRef.current = processor;

      recordTimerRef.current = window.setInterval(() => {
        setRecordTime((prev) => Math.min(prev + 1, MAX_ANSWER_DURATION));
      }, 1000);

      timeoutRef.current = window.setTimeout(async () => {
        clearInterval(recordTimerRef.current!);
        await stopRecording();
        handleNext();
      }, MAX_ANSWER_DURATION * 1000);
    };
  };
    
  // 녹취 종료 및 서버 업로드
  const stopRecording = async () => {
    const token =
      localStorage.getItem("id_token") || localStorage.getItem("access_token");
    clearInterval(recordTimerRef.current!);
    clearTimeout(timeoutRef.current!);
    setIsRecording(false);
    setIsPreparing(true);

    // 비디오 녹화 종료
    mediaRecorderRef.current?.stop();
    await new Promise((res) => setTimeout(res, 300));
    const videoBlob = new Blob(questionVideoChunksRef.current, { type: "video/webm" });
    const videoFile = new File([videoBlob], "clip.webm", { type: "video/webm" });
    const clipForm = new FormData();
    clipForm.append("video", videoFile);
    clipForm.append("interview_id", videoId);
    clipForm.append("question_id", questions[qIdx].id);
    await fetch(`${API_BASE}/video/upload-question-clip/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: clipForm,
    });

    // 자세 세그먼트 상대 시간 계산
    const duration = recordTime;
    console.log('── POSTURE DEBUG ──');
    console.log('raw segmentsRef.current:', segmentsRef.current);
    console.log('recordTime (duration):', recordTime);
    const relSegments = segmentsRef.current
      .filter((s) => s.start < duration && s.end > 0)
      .map((s) => ({
        start: Math.max(0, s.start),
        end:   Math.min(duration, s.end),
      }));
    console.log('computed relSegments:', relSegments);

    if (relSegments.length > 0) {
      const segmentPayload = {
        interview_id: videoId,
        question_id: questions[qIdx].id,
        segments: relSegments,
        feedbacks: relSegments.map(() => ""),
      };

      await fetch(`${API_BASE}/video/extract-question-clip-segments/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(segmentPayload),
      });
    } else {
      console.log(`Q${qIdx + 1}에는 posture 이상 구간이 없어 클립 분할을 건너뜁니다.`);
    }

    // WebSocket 종료
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(new TextEncoder().encode("END"));
      await new Promise((res) => setTimeout(res, 300));
      wsRef.current.close();
    }
    processorRef.current?.disconnect();

    // 오디오 업로드
    const wavBlob = encodeWAV(
      audioChunksRef.current.reduce((acc, cur) => {
        const tmp = new Float32Array(acc.length + cur.length);
        tmp.set(acc);
        tmp.set(cur, acc.length);
        return tmp;
      }, new Float32Array()),
      16000
    );
    const audioForm = new FormData();
    audioForm.append("audio", new File([wavBlob], "answer.wav", { type: "audio/wav" }));
    audioForm.append("transcript", new Blob([transcriptRef.current], { type: "text/plain" }));
    audioForm.append("email", userEmail);
    audioForm.append("question_id", questions[qIdx].id);
    await fetch(`${API_BASE}/audio/upload/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: audioForm,
    });

    // 추가 질문 여부
    if (transcriptRef.current.trim()) {
      await decideFollowup(transcriptRef.current, qIdx);
    }

    setIsPreparing(false);
    audioChunksRef.current = [];
  };

  // 면접 종료
  const endInterview = () => {
    setQuestions([]);
    setQIdx(0);
    setIsInterviewActive(false);
    setTranscript("");
    audioChunksRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
  };

  // 다음 질문 혹은 면접 종료
  const handleNext = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
    if (isRecording) await stopRecording();
    if (qIdx < questions.length - 1) {
      resetPostureBaseline();  
      setQIdx((prev) => prev + 1);
      setTranscript("");
      
      questionStartTimeRef.current = Date.now();
      const offset = (questionStartTimeRef.current - interviewStartRef.current) / 1000;
      questionOffsetRef.current = offset;
      setQuestionOffset(offset);

      segmentsRef.current = [];
      audioChunksRef.current = [];
      questionVideoChunksRef.current = [];

      const stream = streamRef.current;
      if (!stream) {
        console.error("📹 비디오 스트림이 준비되지 않았습니다.");
        return;
      }

      if (!streamRef.current) {
        console.error("녹음 스트림이 없습니다!");
        return;
      }
      const newRec = new MediaRecorder(streamRef.current!, { mimeType: "video/webm" });
      newRec.ondataavailable = (e) => {
        if (e.data.size > 0) questionVideoChunksRef.current.push(e.data);
      };
      newRec.start();
      mediaRecorderRef.current = newRec;
    } else {
      endInterview();
    }
  };

  return (
    <div className="pt-[92px] relative min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 flex flex-col items-start space-y-2 bg-black bg-opacity-50 px-3 py-2 rounded-lg">
              <div>
                <span className="text-xs mr-2">마이크 상태:</span>
                <span
                  className={micConnected ? "text-green-400" : "text-red-400"}
                >
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
        <div className="space-y-6">
          {!isInterviewActive ? (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">면접 준비</h2>
              <p className="text-gray-400 mb-6">
                이력서 기반 질문을 가져오고 녹음을 준비합니다.
              </p>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-300 mb-2">
                  질문 난이도 선택
                </h3>
                <div className="flex gap-2">
                  {["쉬움", "중간", "어려움"].map((level) => (
                    <button
                      key={level}
                      onClick={() =>
                        setDifficulty(level as "쉬움" | "중간" | "어려움")
                      }
                      className={`px-4 py-1 w-16 rounded-full text-sm border text-center transition
                        ${
                          difficulty === level
                            ? "bg-purple-600 text-white border-transparent font-semibold"
                            : "bg-transparent text-gray-300 border-gray-400 hover:bg-gray-600"
                        }
                      `}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
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
          ) : isPreparing ? (
            <div className="bg-gray-800 p-6 rounded-lg flex flex-col items-center space-y-4">
              <p className="text-gray-300">다음 질문 준비 중…</p>
              <svg
                className="w-10 h-10 animate-spin text-primary"
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
          ) : (
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">현재 질문</h3>
                <span className="text-sm text-gray-400">
                  {qIdx + 1}/{questions.length}
                </span>
              </div>
              <p className="text-gray-300">{questions[qIdx]?.text}</p>
              {isPlayingAudio && (
                <div className="mt-2 flex items-center text-sm text-blue-400">
                  <svg
                    className="w-4 h-4 mr-1 animate-pulse"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071a1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243a1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z"
                      clipRule="evenodd"
                    />
                  </svg>
                  질문 음성 재생 중...
                </div>
              )}
              {isRecording && (
                <p className="mt-4 text-sm text-gray-400">
                  남은 답변 시간: {MAX_ANSWER_DURATION - recordTime}초
                </p>
              )}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={handleNext}
                disabled={isLoading || isPlayingAudio}
              >
                {qIdx < questions.length - 1 ? "다음 질문" : "면접 종료"}
              </Button>
            </div>
          )}
        </div>
      </div>
      {(isLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center max-w-xs mx-4 space-y-4">
            <h3 className="text-gray-900 text-lg font-semibold">
              {isLoading ? "처리 중..." : "피드백 생성 중..."}
            </h3>
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
      <audio ref={audioRef} hidden />
    </div>
  );
};
