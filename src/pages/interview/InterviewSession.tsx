import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/shared/Button";
import { usePostureTracking } from "../../hooks/usePostureTracking";
import { encodeWAV } from "../../utils/encodeWAV";

interface Question {
  id: string;
  text: string;
  type: "technical" | "behavioral";
  difficulty: "easy" | "medium" | "hard";
  audio_url?: string; // S3에서 가져온 오디오 URL
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const MAX_ANSWER_DURATION = 90;
const userEmail = localStorage.getItem("user_email") || "anonymous";
const videoId = `interview_${userEmail}_${Date.now()}`;

// S3 버킷 기본 URL
const S3_BASE_URL = "https://knok-tts.s3.ap-northeast-2.amazonaws.com/";

export const InterviewSession = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fullVideoChunksRef = useRef<Blob[]>([]);
  const videoPathRef = useRef<string | null>(null);
  const resumeRef = useRef<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<"쉬움" | "중간" | "어려움">(
    "중간"
  );
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

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
          const avg =
            dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
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

  // ───── 면접 시작 ─────
const onStart = async () => {
  const token =
    localStorage.getItem("id_token") || localStorage.getItem("access_token");
  if (!token) return alert("로그인이 필요합니다.");
  setIsLoading(true);

  try {
    // 1. 선택한 난이도로 새 질문 생성 요청
    // 백엔드에서 질문 생성 및 TTS 서버 호출까지 처리
    const generateRes = await fetch(`${API_BASE}/generate-resume-questions/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        difficulty,
      }),
    });

    if (!generateRes.ok) {
      const errorText = await generateRes.text();
      throw new Error(`질문 생성 실패: ${errorText}`);
    }

    const genResJson = await generateRes.json();
    console.log("새 질문 생성 완료:", genResJson);

    // 2. TTS 서버가 음성 파일을 생성할 시간 확보
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 3. 생성된 질문 가져오기
    const qRes = await fetch(`${API_BASE}/get_all_questions`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!qRes.ok) throw new Error(await qRes.text());
    const { questions: questionMap } = await qRes.json();

    // 4. 오디오 URL과 함께 질문 목록 구성
    const email = userEmail.split("@")[0]; // 사용자 식별자
    const filteredQuestionList = (Object.entries(questionMap) as [string, string][])
      .map(([id, text]) => {
        // 오디오 URL 생성 - 중복된 'questions' 제거, 올바른 형식으로 수정
        const audioUrl = `${S3_BASE_URL}${email}/${id}.wav`;
        return {
          id,
          text: text as string,
          type: "behavioral" as const,
          difficulty: "medium" as const,
          audio_url: audioUrl,
        };
      });

    // 5. 자기소개 질문이 맨 앞으로 오도록 정렬
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
    console.log("정렬된 질문 목록:", sortedQuestionList);

    // 6. 이력서 텍스트 미리 불러오기
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
    } catch (resumeError) {
      console.error("이력서 텍스트 가져오기 실패:", resumeError);
    }

    // 7. 질문 인덱스 초기화 및 면접 시작
    setQIdx(0);
    setIsInterviewActive(true);

    // 8. 전체 면접 영상 녹화 시작
    if (streamRef.current) {
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
        mimeType: "video/webm",
      });
      mediaRecorderRef.current.ondataavailable = (ev) => {
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
      base_question_number: parseInt(questions[questionIndex].id, 10),
      interview_id: videoId,
      existing_question_numbers: questions.map((q) => q.id),
    };

    console.log("▶ 꼬리질문 API 호출 직전 payload:", payload);

    const res = await fetch(`${API_BASE}/followup/check/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    console.log(`▶ followup/check 상태코드: ${res.status}`);

    if (!res.ok) {
      console.error("▶ follow-up check failed:", res.status, await res.text());
      return false;
    }
    const data = await res.json();
    if (data.followup && data.question) {
      const baseId = questions[questionIndex].id.split("-")[0];
      const suffixCnt = questions.filter((q) =>
        q.id.startsWith(baseId + "-")
      ).length;
      const newId = `${baseId}-${suffixCnt + 1}`;
      
      // 꼬리 질문에 대한 오디오 URL 설정
      // 백엔드에서 TTS 생성 후 반환된 audio_url 사용
      const audioUrl = data.audio_url;
      
      setQuestions((prev) => [
        ...prev.slice(0, questionIndex + 1),
        {
          id: newId,
          text: data.question,
          type: "behavioral",
          difficulty: "medium",
          audio_url: audioUrl,
        },
        ...prev.slice(questionIndex + 1),
      ]);
      // 즉시 다음 질문(꼬리질문)으로 이동
      setQIdx(questionIndex + 1);
      return true;
    }
    return false;
  };

  // ───── 질문 인덱스 변경 시 녹음 시작 ─────
  useEffect(() => {
    if (isInterviewActive && questions[qIdx]) {
      // 질문 음성 재생
      playQuestionAudio();
    }
    // eslint-disable-next-line
  }, [isInterviewActive, qIdx, questions]);

  // ───── 질문 음성 재생 ─────
  const playQuestionAudio = async () => {
    if (!questions[qIdx]) return;
    
    try {
      setIsPlayingAudio(true);
      
      // 이전 오디오가 있으면 정지
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // S3에 저장된 오디오 URL이 있으면 사용
      if (questions[qIdx].audio_url) {
        const audioUrl = questions[qIdx].audio_url;
        console.log("사용할 오디오 URL:", audioUrl);
        
        try {
          // 먼저 fetch로 오디오 파일을 가져옴
          const response = await fetch(audioUrl);
          if (!response.ok) {
            throw new Error(`오디오 fetch 실패: ${response.status}`);
          }
          
          // 응답을 Blob으로 변환
          const blob = await response.blob();
          
          // Blob URL 생성
          const blobUrl = URL.createObjectURL(blob);
          
          // audio 요소가 없으면 생성
          if (!audioRef.current) {
            const audioElement = document.createElement('audio');
            document.body.appendChild(audioElement);
            audioRef.current = audioElement;
          }
          
          // 오디오 요소 설정
          audioRef.current.src = blobUrl;
          
          // 이벤트 리스너 설정
          audioRef.current.onended = () => {
            console.log("✅ 오디오 재생 완료");
            setIsPlayingAudio(false);
            startRecording();
            
            // Blob URL 해제
            URL.revokeObjectURL(blobUrl);
          };
          
          audioRef.current.onerror = (e) => {
            console.error("❌ 오디오 재생 오류:", e);
            setIsPlayingAudio(false);
            startRecording();
            
            // Blob URL 해제
            URL.revokeObjectURL(blobUrl);
          };
          
          // 오디오 재생
          await audioRef.current.play();
          console.log("✅ 오디오 재생 시작");
          
        } catch (fetchError) {
          console.error("❌ 오디오 파일 가져오기 실패:", fetchError);
          setIsPlayingAudio(false);
          startRecording();
        }
      } else {
        // S3 오디오 URL이 없으면 바로 녹음 시작
        console.log("오디오 URL이 없어 바로 녹음을 시작합니다.");
        setIsPlayingAudio(false);
        startRecording();
      }
    } catch (error) {
      console.error("질문 음성 재생 실패:", error);
      setIsPlayingAudio(false);
      startRecording(); // 오류가 발생해도 녹음은 시작
    }
  };

  // ───── 녹음 시작 ─────
  const startRecording = async () => {
    if (!questions[qIdx] || !streamRef.current) return;

    setRecordTime(0);
    setIsRecording(true);
    setIsPreparing(false);

    const token =
      localStorage.getItem("id_token") || localStorage.getItem("access_token");
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
      processor.onaudioprocess = (e) => {
        const floatData = e.inputBuffer.getChannelData(0);
        ws.send(convertFloat32ToInt16(floatData));
        audioChunksRef.current.push(new Float32Array(floatData));
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);

      recordTimerRef.current = window.setInterval(() => {
        setRecordTime((prev) => Math.min(prev + 1, MAX_ANSWER_DURATION));
      }, 1000);

      timeoutRef.current = window.setTimeout(async () => {
        clearInterval(recordTimerRef.current!);
        await stopRecording();
        handleNext();
      }, MAX_ANSWER_DURATION * 1000);
    };

    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === 'upload_id') {
        setUploadId(data.upload_id);
        console.log("✅ upload_id 수신:", data.upload_id);
        return;
      }
      if (data.transcript)
        setTranscript((prev) => prev + data.transcript + "\n");
    };
    ws.onerror = (e) => console.error("WebSocket 오류", e);
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
      await new Promise((res) => setTimeout(res, 300));
      wsRef.current.close();
    }
    processorRef.current?.disconnect();

    const token =
      localStorage.getItem("id_token") || localStorage.getItem("access_token");
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
    form.append(
      "audio",
      new File([wavBlob], "answer.wav", { type: "audio/wav" })
    );
    form.append("transcript", new Blob([transcript], { type: "text/plain" }));
    form.append("email", userEmail);
    form.append("question_id", questions[qIdx].id);
    await fetch(`${API_BASE}/audio/upload/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).catch(console.error);

    if (transcript.trim()) {
      await decideFollowup(transcript, qIdx);
    }
    setIsPreparing(false);
    // no need to call handleNext here; qIdx already moved if followup

    // ─── 전체 영상 업로드 등 나머지 로직 ───
    if (mediaRecorderRef.current && qIdx === questions.length - 1) {
      const recorder = mediaRecorderRef.current;
      setClipsLoading(true);
      recorder.onstop = async () => {
        try {
          const fullBlob = new Blob(fullVideoChunksRef.current, {
            type: "video/webm",
          });
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

          const payload = {
            videoId,
            segments: segmentsRef.current,
            feedbacks: segmentsRef.current.map(() => ""),  // 일단 빈 문자열 배열로 채움
          }
          console.log("▶ extract-clips payload:", payload);


          // extract-clips API 호출 시 오류 처리 개선
          // 백엔드 요구사항에 맞게 필드명 수정 (videoId, segments, feedbacks 필수)
          const extractClipsPayload = {
            videoId: videoId, // video_id -> videoId로 다시 변경
            segments: segmentsRef.current,
            video_path: video_path, // 필요한 경우 유지
            feedbacks: segmentsRef.current.map(() => "") // 빈 피드백 배열 추가 (필수 필드)
          };
          console.log("▶ extract-clips 요청 데이터:", extractClipsPayload);
          
          const extractRes = await fetch(`${API_BASE}/video/extract-clips/`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(extractClipsPayload),
          });
          
          if (!extractRes.ok) {
            const errorText = await extractRes.text();
            console.error("▶ extract-clips API 오류:", extractRes.status, errorText);
            throw new Error(`클립 추출 API 실패: ${extractRes.status} ${errorText}`);
          }
          console.log("▶ extract-clips API 성공");

          // analyze-voice API 호출 - 원본 코드 패턴으로 단순화
          // 원본 코드에서는 upload_id와 posture_count만 전송
          if (!uploadId) {
            console.error("❌ upload_id가 없습니다. 웹소켓에서 upload_id를 받지 못했을 수 있습니다.");
            throw new Error("upload_id가 없어 분석을 진행할 수 없습니다.");
          }
          
          const analyzePayload = {
            upload_id: uploadId, // 웹소켓에서 받은 upload_id 사용
            posture_count: countsRef.current
          };
          console.log("▶ analyze-voice 요청 데이터:", analyzePayload);
          
          const r2 = await fetch(`${API_BASE}/analyze-voice/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(analyzePayload),
          });
          
          if (!r2.ok) {
            const errorText = await r2.text();
            console.error("▶ analyze-voice API 오류:", r2.status, errorText);
            throw new Error(`분석 API 실패: ${r2.status} ${errorText}`);
          }
          const { analysis } = await r2.json();
          setClipsLoading(false);

          navigate("/interview/feedback", {
            state: {
              upload_id: videoId,
              segments: segmentsRef.current,
              analysis,
            },
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

  // ───── 면접 종료 처리 함수 추가 ─────
  const endInterview = async () => {
    const token =
      localStorage.getItem("id_token") || localStorage.getItem("access_token");
    
    // 프론트엔드 상태 초기화
    setQuestions([]);  // 질문 목록 초기화
    setQIdx(0);        // 질문 인덱스 초기화
    setIsInterviewActive(false);
    setTranscript("");
    audioChunksRef.current = [];
    
    // 오디오 정지
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
  };

  // ───── 다음 질문 또는 면접 종료 ─────
  const handleNext = async () => {
    // 오디오 재생 중이면 정지
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
    
    if (isRecording) await stopRecording();
    if (qIdx < questions.length - 1) {
      setQIdx((prev) => prev + 1);
      setTranscript("");
      audioChunksRef.current = [];
    } else {
      // 면접 종료 처리
      endInterview();
    }
  };

  return (
    <div className="pt-[92px] relative min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 비디오 + 자세 영역 */}
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

        {/* 질문 & 컨트롤 영역 */}
        <div className="space-y-6">
          {!isInterviewActive ? (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">면접 준비</h2>
              <p className="text-gray-400 mb-6">
                이력서 기반 질문을 가져오고 녹음을 준비합니다.
              </p>

              {/* ✅ 난이도 선택 추가 */}
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
              
              {/* 음성 재생 상태 표시 */}
              {isPlayingAudio && (
                <div className="mt-2 flex items-center text-sm text-blue-400">
                  <svg className="w-4 h-4 mr-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071a1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243a1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
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

      {(isLoading || clipsLoading) && (
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
      
      {/* 오디오 요소를 DOM에 추가 */}
      <audio ref={audioRef} hidden />
    </div>
  );
};