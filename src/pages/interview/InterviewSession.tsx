import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/shared/Button";
import {
  usePostureTracking,
  resetPostureBaseline,
} from "../../hooks/usePostureTracking";
import { encodeWAV } from "../../utils/encodeWAV";
import { useAuth } from "../../contexts/AuthContext";

interface Question {
  id: string;
  text: string;
  type: string;
  difficulty: string;
  audio_url?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;
// const WS_BASE = API_BASE.replace("http", "ws"); // Convert http(s) to ws(s) for WebSocket URL
const MAX_ANSWER_DURATION = 90;
const S3_BASE_URL = "https://knok-tts.s3.ap-northeast-2.amazonaws.com/";

export const InterviewSession = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const resumeRef = useRef<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const questionVideoChunksRef = useRef<Blob[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const transcriptRef = useRef<string>("");
  const interviewStartRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(0);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // 실행 상태 관리를 위한 ref 추가
  const isProcessingRef = useRef<boolean>(false);
  const isHandlingNextRef = useRef<boolean>(false);
  const isStoppingRecordingRef = useRef<boolean>(false);

  // 오디오 관리 상태
  const audioPlaybackRef = useRef<{
    currentAudio: HTMLAudioElement | null;
    isPlaying: boolean;
    playPromise: Promise<void> | null;
  }>({
    currentAudio: null,
    isPlaying: false,
    playPromise: null,
  });

  const auth = useAuth();
  const videoIdRef = useRef(
    `interview_${auth.userEmail || "anonymous"}_${Date.now()}`
  );
  const videoId = videoIdRef.current;

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
  const [difficulty, setDifficulty] = useState<"쉬움" | "중간" | "어려움">(
    "중간"
  );
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [userInteracted, setUserInteracted] = useState(false);

  const { countsRef, segmentsRef } = usePostureTracking(
    videoRef,
    videoId,
    questionStartTimeRef.current
  );

  // 오디오 정지 함수
  const stopCurrentAudio = useCallback(async () => {
    const { currentAudio, playPromise } = audioPlaybackRef.current;
    
    if (playPromise) {
      try {
        await playPromise;
      } catch (error) {
        // 이미 중단된 경우 무시
      }
    }
    
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.removeEventListener('ended', handleAudioEnded);
      currentAudio.removeEventListener('error', handleAudioError);
    }
    
    audioPlaybackRef.current = {
      currentAudio: null,
      isPlaying: false,
      playPromise: null,
    };
    
    setIsPlayingAudio(false);
    setAudioError(null);
  }, []);

  // 오디오 종료 핸들러
  const handleAudioEnded = useCallback(() => {
    setIsPlayingAudio(false);
    audioPlaybackRef.current.isPlaying = false;
    audioPlaybackRef.current.currentAudio = null;
    audioPlaybackRef.current.playPromise = null;
    
    // 오디오 재생 완료 후 안전하게 녹음 시작
    if (isInterviewActive && !isRecording && !isPreparing && !isStoppingRecordingRef.current && !isProcessingRef.current) {
      setTimeout(() => {
        // 다시 한 번 상태 확인
        if (isInterviewActive && !isRecording && !isPreparing && !isStoppingRecordingRef.current && !isProcessingRef.current) {
          startRecording();
        }
      }, 1000); // 충분한 지연으로 안정성 확보
    }
  }, [isInterviewActive, isRecording, isPreparing]);

  // 오디오 에러 핸들러
  const handleAudioError = useCallback((event: Event) => {
    const audio = event.target as HTMLAudioElement;
    const error = audio.error;
    
    let errorMessage = "오디오 재생 중 오류가 발생했습니다.";
    if (error) {
      switch (error.code) {
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = "오디오 파일을 찾을 수 없습니다.";
          break;
        case error.MEDIA_ERR_NETWORK:
          errorMessage = "네트워크 오류로 오디오를 로드할 수 없습니다.";
          break;
        case error.MEDIA_ERR_DECODE:
          errorMessage = "오디오 파일이 손상되었습니다.";
          break;
        case error.MEDIA_ERR_ABORTED:
          errorMessage = "오디오 재생이 중단되었습니다.";
          break;
      }
    }
    
    console.error("❌ 오디오 에러:", errorMessage);
    setAudioError(errorMessage);
    setIsPlayingAudio(false);
    audioPlaybackRef.current.isPlaying = false;
  }, []);

  // 안전한 오디오 재생 함수
  const playAudioSafely = useCallback(async (audioUrl: string): Promise<boolean> => {
    if (!userInteracted) {
      setAudioError("브라우저 정책상 사용자 상호작용 후 오디오를 재생할 수 있습니다.");
      return false;
    }

    try {
      // 기존 오디오 정지
      await stopCurrentAudio();
      
      // 새 오디오 생성
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      
      // 이벤트 리스너 등록
      audio.addEventListener('ended', handleAudioEnded);
      audio.addEventListener('error', handleAudioError);
      
      // 오디오 상태 업데이트
      audioPlaybackRef.current.currentAudio = audio;
      setIsPlayingAudio(true);
      setAudioError(null);
      
      // 오디오 로드 및 재생
      audio.src = audioUrl;
      
      const playPromise = audio.play();
      audioPlaybackRef.current.playPromise = playPromise;
      audioPlaybackRef.current.isPlaying = true;
      
      await playPromise;
      
      return true;
      
    } catch (error) {
      console.error("❌ 오디오 재생 실패:", error);
      
      let errorMessage = "오디오 재생에 실패했습니다.";
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = "브라우저에서 오디오 자동재생이 차단되었습니다. 다시 시도해주세요.";
            break;
          case 'NotSupportedError':
            errorMessage = "지원되지 않는 오디오 형식입니다.";
            break;
          case 'AbortError':
            errorMessage = "오디오 재생이 중단되었습니다.";
            break;
        }
      }
      
      setAudioError(errorMessage);
      setIsPlayingAudio(false);
      audioPlaybackRef.current.isPlaying = false;
      return false;
    }
  }, [userInteracted, stopCurrentAudio, handleAudioEnded, handleAudioError]);

  // 사용자 상호작용 감지
  useEffect(() => {
    const handleUserInteraction = () => {
      setUserInteracted(true);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // 컴포넌트 언마운트 시 오디오 정리
  useEffect(() => {
    return () => {
      // 모든 타이머 정리
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      // 모든 플래그 초기화
      isProcessingRef.current = false;
      isHandlingNextRef.current = false;
      isStoppingRecordingRef.current = false;
      
      // WebSocket 정리
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // 오디오 정리
      stopCurrentAudio();
      
      // 오디오 노드 정리
      if (sourceRef.current && processorRef.current) {
        try {
          sourceRef.current.disconnect(processorRef.current);
          processorRef.current.disconnect();
        } catch (e) {
          // 이미 정리된 경우 무시
        }
        sourceRef.current = null;
        processorRef.current = null;
      }
      
      // 오디오 컨텍스트 정리
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      // MediaRecorder 정리
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // 이미 정리된 경우 무시
        }
        mediaRecorderRef.current = null;
      }
      
      // 스트림 정리
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [stopCurrentAudio]);

  // Float32 PCM → Int16 PCM 변환
  const convertFloat32ToInt16 = (buffer: Float32Array): Uint8Array => {
    const result = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return new Uint8Array(result.buffer);
  };

  // 초기 카메라/마이크 셋업
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
        if (audioCtx.state === "suspended") {
          console.log("🔄 오디오 컨텍스트 재시작 중");
          await audioCtx.resume();
        }

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

  // 면접 시작 핸들러
  const onStart = async () => {
    const token = auth.token;
    if (!token) return alert("로그인이 필요합니다.");
    
    // 사용자 상호작용 등록
    setUserInteracted(true);
    setIsLoading(true);
    try {
      // 질문 및 TTS 음성 생성 요청
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
        throw new Error(
          `질문 생성 실패: ${
            generateRes.statusText || String(generateRes.status)
          }`
        );
      }
      // Frontend now fetches all questions after generation, no longer relies on WebSocket push for initial set
      const qRes = await fetch(`${API_BASE}/get_all_questions/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!qRes.ok) throw new Error(qRes.statusText || String(qRes.status));
      const { questions: questionMap } = await qRes.json();

      const email = auth.userEmail ? auth.userEmail.split("@")[0] : "anonymous";
      const filteredQuestionList = (
        Object.entries(questionMap) as [string, string][]
      ).map(([id, text]) => ({
        id,
        text,
        type: "behavioral",
        difficulty: "medium",
        audio_url: `${S3_BASE_URL}${email}/${id}.wav`,
      }));

      // 자기소개 질문 맨 앞으로
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

      // 면접 활성화
      setIsInterviewActive(true);
      
      // 첫 번째 질문 오디오 재생
      if (sortedQuestionList.length > 0 && sortedQuestionList[0].audio_url) {
        setTimeout(async () => {
          const success = await playAudioSafely(sortedQuestionList[0].audio_url!);
          if (!success) {
            // 오디오 재생 실패 시 자동으로 녹음 시작
            setTimeout(() => {
              if (isInterviewActive && !isRecording) {
                startRecording();
              }
            }, 1000);
          }
        }, 1000); // 면접 시작 후 약간의 지연
      }

      // 이력서 텍스트 가져오기
      try {
        const rRes = await fetch(`${API_BASE}/get-resume-text/`, {
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

      setQIdx(0);
      interviewStartRef.current = Date.now();
      questionStartTimeRef.current = Date.now();
    } catch (err) {
      console.error("면접 시작 실패:", err);
      alert("면접 시작 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 꼬리질문 판단
  const decideFollowup = async (
    userAnswer: string,
    questionIndex: number
  ): Promise<boolean> => {
    const token = auth.token;
    if (!token || !resumeRef.current) return false;
    const payload = {
      resume_text: resumeRef.current,
      user_answer: userAnswer.trim(),
      base_question_number: parseInt(
        questions[questionIndex].id.match(/\d+/)?.[0] || "0",
        10
      ),
      interview_id: videoId,
      existing_question_numbers: questions.map((q) => q.id),
    };
    console.log('[꼬리질문 요청]', payload);
    const res = await fetch(`${API_BASE}/decide_followup_question/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    console.log('[꼬리질문 응답]', res.status, res.statusText);
    if (!res.ok) return false;
    const data = await res.json();
    console.log('[꼬리질문 데이터]', data);
    return data.followup_generated; // Return whether a followup was generated
  };

  // 녹음 및 WebSocket 시작
  const startRecording = async () => {
    if (!questions[qIdx] || !streamRef.current) {
      return;
    }

    // 강력한 중복 실행 방지
    if (isRecording || isPreparing || isStoppingRecordingRef.current || isProcessingRef.current || isHandlingNextRef.current) {
      return;
    }
    
    resetPostureBaseline();
    setRecordTime(0);
    setIsRecording(true);
    setIsPreparing(false);

    const token = auth.token;
    const wsUrl = `${import.meta.env.VITE_WEBSOCKET_BASE_URL}/ws/transcribe?email=${
      auth.userEmail
    }&question_id=${questions[qIdx].id}&token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = async () => {
      try {
        const audioCtx = audioContextRef.current!;
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }

        const source = audioCtx.createMediaStreamSource(streamRef.current!);
        sourceRef.current = source;
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        
        processor.onaudioprocess = (e) => {
          if (!isRecording || ws.readyState !== WebSocket.OPEN) {
            return;
          }
          
          const floatData = e.inputBuffer.getChannelData(0);
          const pcm = convertFloat32ToInt16(floatData);
          
          try {
            ws.send(pcm);
            audioChunksRef.current.push(new Float32Array(floatData));
          } catch (sendError) {
            console.error("❌ WebSocket send failed:", sendError);
          }
        };
        
        source.connect(processor);
        processor.connect(audioCtx.destination);

        // 녹음 타이머 시작
        recordTimerRef.current = window.setInterval(() => {
          setRecordTime((prev) => {
            const newTime = Math.min(prev + 1, MAX_ANSWER_DURATION);
            if (newTime >= MAX_ANSWER_DURATION) {
              clearInterval(recordTimerRef.current!);
              stopRecording();
            }
            return newTime;
          });
        }, 1000);

        // 최대 녹음 시간 타임아웃
        timeoutRef.current = window.setTimeout(async () => {
          clearInterval(recordTimerRef.current!);
          await stopRecording();
        }, MAX_ANSWER_DURATION * 1000);
        
      } catch (audioError) {
        console.error("❌ Audio setup failed:", audioError);
        setIsRecording(false);
        ws.close();
      }
    };

    ws.onmessage = (ev) => {
      try {
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
      } catch (parseError) {
        // Ignore parse errors - they're usually not critical
      }
    };
    
    ws.onerror = (e) => {
      console.error("❌ WebSocket error:", e);
      setIsRecording(false);
    };
    
    ws.onclose = (event) => {
      setIsRecording(false);
    };
  };

  // 녹음 종료, 업로드, 꼬리질문 판단
  const stopRecording = async () => {
    // 강력한 중복 실행 방지
    if (isStoppingRecordingRef.current || !isRecording || isPreparing) {
      return;
    }
    
    isStoppingRecordingRef.current = true;
    
    try {
      // 타이머 정리
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      setIsRecording(false);
      setIsPreparing(true);

      // MediaRecorder 정리
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (recorderError) {
          console.error("❌ MediaRecorder stop error:", recorderError);
        }
      }

      // WebSocket 정리
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(new TextEncoder().encode("END"));
        } catch (wsError) {
          console.error("❌ WebSocket END signal error:", wsError);
        }
        wsRef.current.close();
      }
      
      // Audio nodes 정리
      if (sourceRef.current && processorRef.current) {
        try {
          sourceRef.current.disconnect(processorRef.current);
          processorRef.current.disconnect();
        } catch (disconnectError) {
          console.error("❌ Audio node disconnect error:", disconnectError);
        }
        sourceRef.current = null;
        processorRef.current = null;
      }

      // 현재 데이터 수집
      const currentAudioChunks = [...audioChunksRef.current];
      const currentTranscript = transcriptRef.current;
      const currentVideoChunks = [...questionVideoChunksRef.current];
      const currentRecordTime = recordTime;
      const currentSegments = [...segmentsRef.current];
      const currentUploadId = uploadId;

      // Refs 초기화
      audioChunksRef.current = [];
      transcriptRef.current = "";
      questionVideoChunksRef.current = [];
      segmentsRef.current = [];

      // 잠시 대기 후 백그라운드 처리
      setTimeout(() => {
        // 백그라운드에서 비동기 처리
        processRecordingData(
          currentAudioChunks,
          currentTranscript,
          currentVideoChunks,
          currentRecordTime,
          currentSegments,
          currentUploadId,
          auth.userEmail!,
          questions[qIdx].id,
          videoId,
          auth.token!
        ).catch(error => {
          console.error("❌ Background processing error:", error);
          // 에러가 발생해도 다음 질문으로 진행
          setTimeout(() => {
            if (!isHandlingNextRef.current && !isProcessingRef.current) {
              handleNext();
            }
          }, 1000);
        });
      }, 500);
      
    } catch (error) {
      console.error("❌ Stop recording error:", error);
    } finally {
      // 플래그 해제
      setTimeout(() => {
        isStoppingRecordingRef.current = false;
      }, 1000);
    }
  };

  const processRecordingData = async (
    audioChunks: Float32Array[],
    transcript: string,
    videoChunks: Blob[],
    duration: number,
    segments: { start: number; end: number }[],
    currentUploadId: string | null,
    userEmail: string,
    questionId: string,
    interviewId: string,
    token: string
  ) => {
    // 강력한 중복 실행 방지
    if (isProcessingRef.current || isPreparing) {
      return;
    }
    
    isProcessingRef.current = true;
    setIsPreparing(true);
    
    try {
      // transcript가 비어있거나 너무 짧으면 즉시 다음 질문으로
      const refinedTranscript = transcript.trim();
      if (
        !refinedTranscript ||
        refinedTranscript.toLowerCase() === "blob" ||
        refinedTranscript.length <= 5
      ) {
        setTimeout(() => {
          isProcessingRef.current = false;
          setIsPreparing(false);
          if (!isHandlingNextRef.current) {
            handleNext();
          }
        }, 1000);
        return;
      }

      // 백그라운드에서 업로드 작업 수행 (에러가 나도 계속 진행)
      const uploadPromises = [];

      // Video clip upload
      if (videoChunks.length > 0) {
        const videoUploadPromise = (async () => {
          try {
            const videoBlob = new Blob(videoChunks, { type: "video/webm" });
            const videoFile = new File([videoBlob], "clip.webm", { type: "video/webm" });
            const clipForm = new FormData();
            clipForm.append("video", videoFile);
            clipForm.append("interview_id", interviewId);
            clipForm.append("question_id", questionId);
            
            const response = await fetch(`${API_BASE}/video/upload-question-clip/`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: clipForm,
            });
            
            if (!response.ok) {
              console.error("❌ Video upload failed:", response.status);
            }
          } catch (error) {
            console.error("❌ Video upload error:", error);
          }
        })();
        uploadPromises.push(videoUploadPromise);
      }

      // Audio upload
      if (audioChunks.length > 0) {
        const audioUploadPromise = (async () => {
          try {
            const wavBlob = encodeWAV(
              audioChunks.reduce((acc, cur) => {
                const tmp = new Float32Array(acc.length + cur.length);
                tmp.set(acc);
                tmp.set(cur, acc.length);
                return tmp;
              }, new Float32Array()),
              16000
            );
            
            const audioForm = new FormData();
            audioForm.append("audio", new File([wavBlob], "answer.wav", { type: "audio/wav" }));
            audioForm.append("transcript", new Blob([refinedTranscript], { type: "text/plain" }));
            audioForm.append("email", userEmail);
            audioForm.append("question_id", questionId);
            if (currentUploadId) {
              audioForm.append("upload_id", currentUploadId);
            }
            
            const response = await fetch(`${API_BASE}/audio/upload/`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: audioForm,
            });
            
            if (!response.ok) {
              console.error("❌ Audio upload failed:", response.status);
            }
          } catch (error) {
            console.error("❌ Audio upload error:", error);
          }
        })();
        uploadPromises.push(audioUploadPromise);
      }

      // 세그먼트 처리는 건너뛰기 (500 에러 발생 원인)
      // const relSegments = segments.filter(...);
      // if (relSegments.length > 0) { ... }

      // 업로드 완료 대기 (최대 5초)
      await Promise.allSettled(uploadPromises);

      // 꼬리질문 판단
      try {
        const shouldFollowup = await Promise.race([
          decideFollowup(refinedTranscript, qIdx),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        
        if (shouldFollowup) {
          const qRes = await fetch(`${API_BASE}/get_all_questions/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (qRes.ok) {
            const { questions: questionMap } = await qRes.json();
            const emailPrefix = userEmail.split("@")[0];
            const updatedQuestionList = (
              Object.entries(questionMap) as [string, string][]
            ).map(([id, text]) => ({
              id,
              text,
              type: "behavioral",
              difficulty: "medium",
              audio_url: `${S3_BASE_URL}${emailPrefix}/${id}.wav`,
            }));

            const sortedUpdatedQuestionList = [...updatedQuestionList].sort((a, b) => {
              const getNumericId = (id: string) => {
                const match = id.match(/\d+/);
                return match ? parseInt(match[0]) : Number.MAX_SAFE_INTEGER;
              };
              return getNumericId(a.id) - getNumericId(b.id);
            });

            setQuestions(sortedUpdatedQuestionList);
            
            const nextQIndex = sortedUpdatedQuestionList.findIndex(
              (q) => q.id.startsWith(questions[qIdx].id + "-")
            ); 
            
            if (nextQIndex !== -1) {
              setQIdx(nextQIndex);
            } else {
              setQIdx(prev => prev + 1);
            }
            
            isProcessingRef.current = false;
            setIsPreparing(false);
            return;
          }
        }
      } catch (followupError) {
        console.error("❌ Followup decision error:", followupError);
      }
      
      // 다음 질문으로 진행
      setTimeout(() => {
        isProcessingRef.current = false;
        setIsPreparing(false);
        if (!isHandlingNextRef.current) {
          handleNext();
        }
      }, 1000);

    } catch (error) {
      console.error("❌ Processing error:", error);
      setTimeout(() => {
        isProcessingRef.current = false;
        setIsPreparing(false);
        if (!isHandlingNextRef.current) {
          handleNext();
        }
      }, 2000);
    }
  };

  // 면접 종료
  const endInterview = async () => {
    setIsLoading(true);
    const token = auth.token; // Use auth.token
    if (!token) return;

    // Final full interview video processing (이제 전체 영상 업로드 안함)
    if (!uploadId) {
      console.warn(
        "Upload ID가 없어 최종 분석을 건너뛰고 피드백 페이지로 이동합니다."
      );
    }

    // Existing posture analysis upload remains (countsRef.current)
    // This part should still be done to analyze voice data after last question
    if (uploadId && countsRef.current) {
      try {
        console.log("분석 요청 전 uploadId:", uploadId);
        console.log("분석 요청 전 posture_count:", countsRef.current);
        const analyzePayload = {
          upload_id: uploadId,
          posture_count: countsRef.current,
        };
        console.log("▶ Final analyze-voice 요청 데이터:", analyzePayload);

        const r2 = await fetch(`${API_BASE}/analyze-voice/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(analyzePayload),
        });

        if (!r2.ok) {
          const errorText = r2.statusText || String(r2.status);
          console.error("▶ analyze-voice API 오류:", r2.status, errorText);
          throw new Error(`분석 API 실패: ${errorText}`);
        }
        const { analysis } = await r2.json();
        navigate("/interview/feedback", {
          state: {
            upload_id: videoId, // Use videoId as interview_id
            segments: [], // Segments will be fetched in FeedbackReport
            analysis,
            clips: [], // Clips will be fetched in FeedbackReport
          },
        });
      } catch (e) {
        console.error("최종 분석 실패:", e);
        console.error("실패 당시 uploadId:", uploadId);
        console.error("실패 당시 posture_count:", countsRef.current);
        alert("최종 분석 실패");
      }
    } else {
      navigate("/interview/feedback", {
        state: {
          upload_id: videoId,
          segments: [],
          analysis: {},
          clips: [],
        },
      });
    }

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
    // 강력한 중복 호출 방지
    if (isHandlingNextRef.current || isPreparing || isLoading) {
      return;
    }
    
    isHandlingNextRef.current = true;
    
    try {
      // 사용자 상호작용 등록
      setUserInteracted(true);
      
      // 현재 녹음 중이면 중단
      if (isRecording) {
        await stopRecording();
        return; // stopRecording에서 다시 handleNext가 호출됨
      }
      
      // 현재 오디오 정지 (오디오 재생 중단 문제 해결)
      if (isPlayingAudio) {
        await stopCurrentAudio();
        // 오디오 중단 후 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (qIdx < questions.length - 1) {
        resetPostureBaseline();
        setQIdx((prev) => prev + 1);
        setTranscript("");
        audioChunksRef.current = [];

        // 비디오 녹화 시작
        if (streamRef.current) {
          questionVideoChunksRef.current = [];
          try {
            const newRecorder = new MediaRecorder(streamRef.current, {
              mimeType: "video/webm",
            });
            newRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) questionVideoChunksRef.current.push(e.data);
            };
            newRecorder.start();
            mediaRecorderRef.current = newRecorder;
            questionStartTimeRef.current = Date.now();
          } catch (recorderError) {
            console.error("❌ MediaRecorder creation failed:", recorderError);
          }
        }

        // 다음 질문 오디오 재생
        const nextQuestion = questions[qIdx + 1];
        if (nextQuestion?.audio_url) {
          // 오디오 재생 전 잠시 대기
          setTimeout(async () => {
            if (isHandlingNextRef.current) { // 여전히 처리 중인 경우만 실행
              const success = await playAudioSafely(nextQuestion.audio_url!);
              if (!success) {
                // 오디오 재생 실패 시 자동으로 녹음 시작
                setTimeout(() => {
                  if (isInterviewActive && !isRecording && !isPreparing) {
                    startRecording();
                  }
                }, 1000);
              }
            }
          }, 1000);
        } else {
          // 오디오 URL이 없는 경우 즉시 녹음 시작
          setTimeout(() => {
            if (isInterviewActive && !isRecording && !isPreparing) {
              startRecording();
            }
          }, 1000);
        }
      } else {
        endInterview();
      }
    } catch (error) {
      console.error("❌ 질문 전환 중 오류:", error);
    } finally {
      // 처리 완료 후 플래그 해제
      setTimeout(() => {
        isHandlingNextRef.current = false;
      }, 2000);
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
              
              {/* 오디오 상태 표시 */}
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
              
              {/* 오디오 에러 표시 */}
              {audioError && (
                <div className="mt-2 p-3 bg-red-900/50 border border-red-500 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-red-300 font-medium">오디오 재생 오류</p>
                      <p className="text-xs text-red-400 mt-1">{audioError}</p>
                      {questions[qIdx]?.audio_url && (
                        <button
                          onClick={async () => {
                            setUserInteracted(true);
                            await playAudioSafely(questions[qIdx].audio_url!);
                          }}
                          className="mt-2 text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition"
                        >
                          다시 재생
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* 사용자 상호작용 필요 알림 */}
              {!userInteracted && isInterviewActive && (
                <div className="mt-2 p-3 bg-yellow-900/50 border border-yellow-500 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-yellow-300 font-medium">브라우저 자동재생 제한</p>
                      <p className="text-xs text-yellow-400 mt-1">
                        오디오 재생을 위해 아무 버튼이나 클릭해주세요.
                      </p>
                    </div>
                  </div>
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
      {isLoading && (
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
