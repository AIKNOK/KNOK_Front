import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from '../../components/shared/Button';
import { usePostureTracking } from "../../hooks/usePostureTracking";
import { encodeWAV } from "../../utils/encodeWAV";

interface Question {
  id: string;
  text: string;
  type: "technical" | "behavioral";
  difficulty: "easy" | "medium" | "hard";
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const MAX_ANSWER_DURATION = 90;
const userEmail = localStorage.getItem("user_email") || "anonymous";
const videoId = `interview_${userEmail}_${Date.now()}`;

export const InterviewSession = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fullVideoChunksRef = useRef<Blob[]>([]);
  const videoPathRef = useRef<string | null>(null);
  const resumeRef = useRef<string>("");

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
  const [clipsLoading, setClipsLoading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const timeoutRef     = useRef<number | null>(null);

  const { countsRef, segmentsRef } = usePostureTracking(videoRef, videoId);

  // Float32 -> Int16 변환 함수
  const convertFloat32ToInt16 = (buffer: Float32Array): Uint8Array => {
    const result = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return new Uint8Array(result.buffer);
  };

  // ───── 미디어(비디오+오디오) 설정 ─────
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

        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
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
      mediaStream?.getTracks().forEach(t => t.stop());
    };
  }, [navigate]);

  // ───── 면접 시작 ─────
  const onStart = async () => {
    const token = localStorage.getItem("id_token") || localStorage.getItem("access_token");
    if (!token) return alert("로그인이 필요합니다.");
    setIsLoading(true);

    try {
      // 질문 생성
      const qRes = await fetch(`${API_BASE}/generate-resume-questions/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!qRes.ok) throw new Error(await qRes.text());
      const { questions: qs }: { questions: string[] } = await qRes.json();
      setQuestions(qs.map((t, i) => ({ id: `${i+1}`, text: t, type: "behavioral", difficulty: "medium" })));

      // 이력서 텍스트 미리 가져오기
      const rRes = await fetch(`${API_BASE}/get-resume-text/`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (rRes.ok) {
        const { resume_text } = await rRes.json();
        setResumeText(resume_text || "");
        resumeRef.current = resume_text || "";
      }

      // 질문 인덱스 초기화 및 면접 활성화
      setQIdx(0);
      setIsInterviewActive(true);

      // 전체 영상 녹화 시작
      if (streamRef.current) {
        mediaRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
        mediaRecorderRef.current.ondataavailable = ev => {
          if (ev.data.size > 0) fullVideoChunksRef.current.push(ev.data);
        };
        mediaRecorderRef.current.start();
      }
    } catch (err) {
      console.error("면접 시작 실패:", err);
      alert("면접 시작 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // ───── 꼬리 질문 API 호출 함수 ─────
  const decideFollowup = async (userAnswer: string, questionIndex: number): Promise<boolean> => {
    const token = localStorage.getItem("id_token") || localStorage.getItem("access_token");
    if (!token || !resumeRef.current) return false;

    const payload = {
      resume_text:               resumeRef.current,
      user_answer:               userAnswer.trim(),
      base_question_number:      parseInt(questions[questionIndex].id, 10),
      interview_id:              videoId,
      existing_question_numbers: questions.map(q => q.id),
    };

    const res = await fetch(`${API_BASE}/followup/check/`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('▶ follow-up check failed:', res.status, await res.text());
      return false;
    }
    const data = await res.json();
    if (data.followup && data.question) {
      const baseId    = questions[questionIndex].id.split('-')[0];
      const suffixCnt = questions.filter(q => q.id.startsWith(baseId + '-')).length;
      const newId     = `${baseId}-${suffixCnt + 1}`;
      setQuestions(prev => [
        ...prev.slice(0, questionIndex + 1),
        { id: newId, text: data.question, type: 'behavioral', difficulty: 'medium' },
        ...prev.slice(questionIndex + 1),
      ]);
      return true;
    }
    return false;
  };

  // ───── 질문 인덱스 변경 시 녹음 시작 ─────
  useEffect(() => {
    if (isInterviewActive) startRecording();
    // eslint-disable-next-line
  }, [isInterviewActive, qIdx]);

  // ───── 녹음 시작 ─────
  const startRecording = async () => {
    if (!questions[qIdx] || !streamRef.current) return;

    setRecordTime(0);
    setIsRecording(true);
    setIsPreparing(false);

    const token = localStorage.getItem("id_token") || localStorage.getItem("access_token");
    const ws = new WebSocket(
      `ws://localhost:8001/ws/transcribe?email=${userEmail}&question_id=${questions[qIdx].id}&token=${token}`
    );
    wsRef.current = ws;

    ws.onopen = async () => {
      const audioCtx = audioContextRef.current!;
      if (audioCtx.state === "suspended") await audioCtx.resume();

      const source = audioCtx.createMediaStreamSource(streamRef.current!);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = e => {
        const floatData = e.inputBuffer.getChannelData(0);
        ws.send(convertFloat32ToInt16(floatData));
        audioChunksRef.current.push(new Float32Array(floatData));
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);

      recordTimerRef.current = window.setInterval(() => {
        setRecordTime(prev => Math.min(prev + 1, MAX_ANSWER_DURATION));
      }, 1000);

      timeoutRef.current = window.setTimeout(async () => {
        clearInterval(recordTimerRef.current!);
        await stopRecording();
        handleNext();
      }, MAX_ANSWER_DURATION * 1000);
    };

    ws.onmessage = ev => {
      const data = JSON.parse(ev.data);
      console.log("🟡 ws.onmessage: ", data);
      if (data.transcript) setTranscript(prev => prev + data.transcript + "\n");
    };
    ws.onerror = e => console.error("WebSocket 오류", e);
    ws.onclose = () => console.log("WebSocket 종료");
  };

  // ───── 녹음 종료 & 업로드 & 꼬리질문 ─────
  const stopRecording = async () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsRecording(false);
    setIsPreparing(true);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(new TextEncoder().encode("END"));
      await new Promise(res => setTimeout(res, 300));
      wsRef.current.close();
    }
    processorRef.current?.disconnect();

    const token = localStorage.getItem("id_token") || localStorage.getItem("access_token");
    const wavBlob = encodeWAV(
      audioChunksRef.current.reduce((acc, cur) => {
        const tmp = new Float32Array(acc.length + cur.length);
        tmp.set(acc);
        tmp.set(cur, acc.length);
        return tmp;
      }, new Float32Array()),
      16000
    );
    const form = new FormData();
    form.append("audio", new File([wavBlob], "answer.wav", { type: "audio/wav" }));
    form.append("transcript", new Blob([transcript], { type: "text/plain" }));
    form.append("email", userEmail);
    form.append("question_id", questions[qIdx].id);
    await fetch(`${API_BASE}/audio/upload/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).catch(console.error);

    if (transcript.trim().length > 0) {
      console.log("🟢 꼬리질문 API 호출!");
      try {
        await decideFollowup(transcript, qIdx);
      } catch (err) {
        console.error("꼬리 질문 결정 실패:", err);
        alert("꼬리 질문 결정 중 오류가 발생했습니다.");
      }
    } else {
      console.warn("🟡 꼬리질문 없음: 답변이 비어있음");
    }
    setIsPreparing(false);

    // ─── 전체 영상 업로드 등 나머지 로직 ───
    if (mediaRecorderRef.current && qIdx === questions.length - 1) {
      const recorder = mediaRecorderRef.current;
      setClipsLoading(true);
      recorder.onstop = async () => {
        try {
          const fullBlob = new Blob(fullVideoChunksRef.current, { type: "video/webm" });
          const vf = new FormData();
          vf.append("video", fullBlob, `${videoId}.webm`);
          vf.append("videoId", videoId);
          const r1 = await fetch(`${API_BASE}/video/upload/`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: vf,
          });
          if (!r1.ok) throw new Error(await r1.text());
          const { video_path } = await r1.json();
          videoPathRef.current = video_path;

          await fetch(`${API_BASE}/video/extract-clips/`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ videoId, segments: segmentsRef.current, video_path }),
          });

          const r2 = await fetch(`${API_BASE}/analyze-voice/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ video_id: videoId, posture_count: countsRef.current }),
          });
          if (!r2.ok) throw new Error("분석 API 실패");
          const { analysis } = await r2.json();
          setClipsLoading(false);

          navigate("/interview/feedback", {
            state: { upload_id: videoId, segments: segmentsRef.current, analysis },
          });
        } catch (e) {
          console.error(e);
          alert("전체 영상 업로드 실패");
          setClipsLoading(false);
        }
      };
      recorder.stop();
    }
  };

  // ───── 다음 질문 또는 면접 종료 ─────
  const handleNext = async () => {
    if (isRecording) await stopRecording();
    if (qIdx < questions.length - 1) {
      setQIdx(prev => prev + 1);
      setTranscript("");
      audioChunksRef.current = [];
    } else {
      // 면접 종료 처리…
    }
  };

  return (
    <div className="pt-[92px] relative min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 비디오 + 자세 영역 */}
        <div className="md:col-span-2">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <div className="absolute top-4 left-4 flex flex-col items-start space-y-2 bg-black bg-opacity-50 px-3 py-2 rounded-lg">
              <div>
                <span className="text-xs mr-2">마이크 상태:</span>
                <span className={micConnected ? "text-green-400" : "text-red-400"}>
                  {micConnected ? "연결됨" : "미연결"}
                </span>
              </div>
              <div className="w-32 h-2 bg-gray-600 rounded overflow-hidden">
                <div className="h-full bg-green-400" style={{ width: `${micLevel}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* 질문 & 컨트롤 영역 */}
        <div className="space-y-6">
          {!isInterviewActive ? (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">면접 준비</h2>
              <p className="text-gray-400 mb-6">이력서 기반 질문을 생성하고 녹음을 준비합니다.</p>
              <Button onClick={onStart} className="w-full" size="lg" disabled={isLoading || !micConnected} isLoading={isLoading}>
                AI 면접 시작하기
              </Button>
            </div>
          ) : isPreparing ? (
            <div className="bg-gray-800 p-6 rounded-lg flex flex-col items-center space-y-4">
              <p className="text-gray-300">다음 질문 준비 중…</p>
              <svg className="w-10 h-10 animate-spin text-primary" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : (
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">현재 질문</h3>
                <span className="text-sm text-gray-400">{qIdx + 1}/{questions.length}</span>
              </div>
              <p className="text-gray-300">{questions[qIdx]?.text}</p>
              <p className="mt-4 text-sm text-gray-400">남은 답변 시간: {MAX_ANSWER_DURATION - recordTime}초</p>
              <Button variant="outline" className="w-full mt-4" onClick={handleNext} disabled={isLoading}>
                {qIdx < questions.length - 1 ? "다음 질문" : "면접 종료"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {(isLoading || clipsLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center max-w-xs mx-4 space-y-4">
            <h3 className="text-gray-900 text-lg font-semibold">{isLoading ? "처리 중..." : "피드백 생성 중..."}</h3>
            <svg className="mx-auto w-12 h-12 animate-spin text-primary" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};