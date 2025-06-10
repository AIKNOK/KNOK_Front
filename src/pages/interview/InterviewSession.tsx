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
  /*=============================================*/

  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoPathRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fullVideoChunksRef = useRef<Blob[]>([]);

  const convertFloat32ToInt16 = (buffer: Float32Array): Uint8Array => {
    const result = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return new Uint8Array(result.buffer);
  };

  // 포즈 추적 훅 (videoRef 전달 → 내부에서 얼굴/자세 추적)
  const { countsRef, segmentsRef } = usePostureTracking(videoRef, videoId);


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
  const wsRef = useRef<WebSocket | null>(null);
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
          video: true, // 필요 없으면 false
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            sampleSize: 16,
          },
        });
        // 비디오 화면에 스트림 연결
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;
        mediaStream = stream;
        setMicConnected(true);
        console.log("🎤 마이크 스트림 준비 완료");

        // AudioContext / webkitAudioContext 타입 단언
        const AudioCtxClass =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) {
          alert("이 브라우저는 AudioContext를 지원하지 않습니다.");
          return;
        }

        // 샘플레이트를 44100으로 고정 (encodeWAV와 일치시킴)
        const audioCtx = new AudioCtxClass({ sampleRate: 16000 });
        audioContextRef.current = audioCtx;

        // Chrome에서 HTTPS가 아닌 경우 AudioContext가 suspended가 되므로 resume
        if (audioCtx.state === "suspended") {
          console.log("🎧 AudioContext 초기 상태:", audioCtx.state);
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

      // 전체 면접 영상 녹화 시작
      if (streamRef.current) {
        mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
          mimeType: "video/webm",
        });
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            fullVideoChunksRef.current.push(event.data);
          }
        };
        mediaRecorderRef.current.start();
        console.log("🎥 전체 면접 영상 녹화 시작");
      }

      // 이력서 텍스트 가져오기
      const resumeRes = await fetch(`${API_BASE}/get-resume-text/`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resumeRes.ok) {
        const { resume_text } = await resumeRes.json();
        setResumeText(resume_text || "");
        console.log("📄 resume_text:", resume_text);
      } else {
        console.warn("⚠️ 이력서 텍스트 응답 오류:", resumeRes.status);
      }
    } catch (err) {
      console.error("❌ 질문 생성 실패:", err);
      alert("질문 생성 실패");
    } finally {
      setIsLoading(false);
    }

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
    startRecording(); // ✅ streamRef는 이미 준비된 상태
  }, [isInterviewActive, qIdx]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4) 녹음 시작 → AudioContext 생성 → ScriptProcessorNode로 샘플 수집
  // ─────────────────────────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (!questions[qIdx] || !streamRef.current) return;

    const token =
      localStorage.getItem("id_token") || localStorage.getItem("access_token");
    const email = localStorage.getItem("user_email") || "anonymous";
    const questionId = questions[qIdx].id;

    const ws = new WebSocket(
      `ws://localhost:8001/ws/transcribe?email=${email}&question_id=${questionId}&token=${token}`
    );
    wsRef.current = ws;

    ws.onopen = async () => {
      console.log("✅ WebSocket 연결 성공");
      const dummyAudio = new Uint8Array(16000 * 2); // 약 100ms 분량 (16kHz, 16bit PCM)
      console.log("🟡 초기 dummy 오디오 전송:", dummyAudio.length, "bytes");

      // ✅ AudioContext 연결 (이제 streamRef가 완전히 준비됨)
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 16000 });
      console.log("🎧 AudioContext 샘플레이트:", audioCtx.sampleRate);
      audioContextRef.current = audioCtx;
      await audioCtx.resume();

      const source = audioCtx.createMediaStreamSource(streamRef.current!);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        console.log("🎧 onaudioprocess 실행");
        const floatData = e.inputBuffer.getChannelData(0);
        const pcmData = convertFloat32ToInt16(floatData);
        audioChunksRef.current.push(new Float32Array(floatData)); // ✅ 녹음 저장용
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(pcmData);
          console.log("🎙️ 오디오 전송:", pcmData.length, "bytes");
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      // ✅ 타이머 시작
      setRecordTime(0);
      setIsRecording(true);
      recordTimerRef.current = window.setInterval(() => {
        setRecordTime((prev) => {
          if (prev + 1 >= MAX_ANSWER_DURATION) {
            (async () => await stopRecording())();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.transcript) {
        setTranscript((prev) => prev + data.transcript + "\n");
      }
      if (data.status === "done") {
        console.log("✅ 백엔드 업로드 완료");
        ws.close();
      }
    };

    ws.onerror = (e) => {
      console.error("❌ WebSocket 오류", e);
    };

    ws.onclose = () => {
      console.log("🔌 WebSocket 종료");
    };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5) 녹음 중지 → 샘플 합쳐서 WAV로 변환 → 서버 업로드 → 질문 변경 or 면접 종료
  // ─────────────────────────────────────────────────────────────────────────────

  const stopRecording = async () => {
    console.log("▶ stopRecording 호출됨");
    setIsRecording(false);

    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      console.log("▶ 녹음 타이머 정지");
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const endSignal = new TextEncoder().encode("END"); // <-- 중요!
      wsRef.current.send(endSignal);
      console.log("📤 END 신호 전송 (바이트)");

      await new Promise((res) => setTimeout(res, 300));
      wsRef.current.close();
    }

    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());

    const token =
      localStorage.getItem("id_token") || localStorage.getItem("access_token");
    const email = localStorage.getItem("user_email") || "anonymous";
    const currentQ = questions[qIdx - 1] ||
      questions[qIdx] || { id: "unknown" };
    const questionId = currentQ.id;

    // Float32Array[] → Float32Array
    const floatArray = audioChunksRef.current.reduce((acc, cur) => {
      const tmp = new Float32Array(acc.length + cur.length);
      tmp.set(acc, 0);
      tmp.set(cur, acc.length);
      return tmp;
    }, new Float32Array());

    const wavBlob = encodeWAV(floatArray, 16000);
    const wavFile = new File([wavBlob], "answer.wav", { type: "audio/wav" });
    const textBlob = new Blob([transcript], { type: "text/plain" });
    const textFile = new File([textBlob], "transcript.txt", {
      type: "text/plain",
    });

    const formData = new FormData();
    formData.append("audio", wavFile);
    formData.append("transcript", textFile);
    formData.append("email", email);
    formData.append("question_id", questionId);

    try {

      const uploadRes = await fetch(`${API_BASE}/video/upload/`, {

      await fetch(`${API_BASE}/audio/upload/`, {

        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const uploadJson = await uploadRes.json();
      
      console.log("▶ 오디오 업로드 응답 상태:", uploadRes.status);

      console.log("✅ S3 업로드 완료");

    } catch (err) {
      console.error("❌ 업로드 실패", err);
    }


    // 5-4) 꼬리 질문 판단 요청
    const decideFollowup = async (userAnswer: string): Promise<boolean> => {
      if (!token || !resumeText) return false;

      try {
        const res = await fetch(`${API_BASE}/followup/check/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resume_text: resumeText,
            user_answer: userAnswer,
          }),
        });

        const data = await res.json();
        console.log("🟢 follow-up 판단 결과:", data);

        const currentQuestionId = questions[qIdx].id; 
        const baseId = currentQuestionId.split("-")[0]; 

        const followups = questions.filter(q =>
          q.id.startsWith(`${baseId}-`)
        );

        const followupCount = followups.length;

        if (data.followup && data.generated_question && followupCount < 2) {
          const newId = `${baseId}-${followupCount + 1}`;

          setQuestions((prev) => [
            ...prev.slice(0, qIdx + 1),
            {
              id: newId,
              text: data.generated_question,
              type: "behavioral",
              difficulty: "medium",
            },
            ...prev.slice(qIdx + 1),
          ]);
          return true;
        }
      } catch (e) {
        console.error("followup 요청 실패:", e);
      }
      return false;
    };
    // 실제 응답으로 바꾸기 전까진 하드코딩된 답변 사용용
    const dummyAnswer = "옛 어른들께서 하신 말씀 중에 “농업이 살아야 나라가 산다”는 이야기를 들은 적이 있습니다. 저는 농업이 가진 가치와 가능성을 높게 평가합니다. 하지만 디지털 전환의 흐름 속에서 농업은 여전히 소외되는 경우가 있다고 느꼈습니다. 저는 AWS 클라우드 스쿨에서 쌓은 경험과 역량을 바탕으로, 스마트 농업, 클라우드 전환, 정보 보안 강화 등 다양한 IT 분야에서 제 능력을 충분히 발휘할 수 있다고 생각합니다. "
    await decideFollowup(dummyAnswer); //STT가 연결되면 transcript로 대체체

    // 전체 영상 업로드 처리
    if (mediaRecorderRef.current && qIdx === questions.length - 1) {
      const recorder = mediaRecorderRef.current;
  
      recorder.onstop = async () => {
        const fullVideoBlob = new Blob(fullVideoChunksRef.current, {
          type: "video/webm",
        });
        const videoForm = new FormData();
        videoForm.append("video", fullVideoBlob, `${videoId}.webm`);
        videoForm.append("videoId", videoId);

        try {
          const res = await fetch(`${API_BASE}/video/upload/`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: videoForm,
          });

          const resJson = await res.json();
          videoPathRef.current = resJson.video_path;

          console.log("🎥 전체 영상 업로드 완료:", videoPathRef.current);

          if (videoPathRef.current) {
            const clipRes = await fetch(`${API_BASE}/video/extract-clips/`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                videoId,
                segments: segmentsRef.current,
                video_path: videoPathRef.current,
              }),
            });
            console.log("🎞️ 클립 추출 요청 응답 상태:", clipRes.status);
          } else {
            console.warn("⚠️ video_path가 설정되지 않아 클립 추출을 생략합니다.");
          }

          navigate("/interview/feedback");

        } catch (err) {
          console.error("🔥 전체 영상 업로드 또는 클립 추출 실패:", err);
        }
      };

      recorder.stop();
    }

    // 5-5) 다음 질문으로 이동

    if (qIdx < questions.length - 1) {
      setQIdx((prev) => prev + 1);
      setTranscript("");
      audioChunksRef.current = [];
    } else {
      setIsInterviewActive(false);

      // 자세 카운트 전송
      try {
        const postureRes = await fetch(`${API_BASE}/posture/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId,
            counts: countsRef.current,
            segments: segmentsRef.current,
          }),
        });
        console.log("▶ 자세 카운트 전송 응답 상태:", postureRes.status);
      } catch (err) {
        console.error("자세 카운트 전송 실패:", err);
      }

      navigate("/interview/feedback");

    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  //  수동으로 “다음 질문” 또는 “면접 종료” 버튼 클릭 시
  // ─────────────────────────────────────────────────────────────────────────────
  const handleNext = async () => {
    console.log("▶ handleNext() 호출됨, isRecording:", isRecording);
    if (isRecording) {
      console.log("▶ stopRecording() 호출 전");
      await stopRecording();
      console.log("▶ stopRecording() 호출 완료");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  //  UI 렌더링
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