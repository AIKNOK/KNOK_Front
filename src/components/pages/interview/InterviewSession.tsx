import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/Button';

interface Question {
  id: string;
  text: string;
  type: 'technical' | 'behavioral';
  difficulty: 'easy' | 'medium' | 'hard';
}

export const InterviewSession: React.FC = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime] = useState(30 * 60); // 30분
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: '1',
    text: '자신이 참여했던 프로젝트 중 가장 도전적이었던 경험에 대해 설명해주세요.',
    type: 'behavioral',
    difficulty: 'medium',
  });

  const [nextQuestion, setNextQuestion] = useState<Question | null>({
    id: '2',
    text: 'React의 가상 DOM(Virtual DOM)에 대해 설명해주세요.',
    type: 'technical',
    difficulty: 'medium',
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };
        
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          // TODO: 녹화된 영상 처리 로직 구현
          chunksRef.current = [];
        };
      } catch (error) {
        console.error('카메라 접근 실패:', error);
        navigate('/interview/check-environment');
      }
    };

    startCamera();
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [navigate]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isRecording) {
      timer = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalTime) {
            handleEndInterview();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording, totalTime]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  };

  const handleNextQuestion = () => {
    if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
      // TODO: AI로부터 다음 질문 받아오기
      setNextQuestion(null);
    }
  };

  const handleEndInterview = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    // TODO: 면접 결과 페이지로 이동
    navigate('/interview/feedback');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* 왼쪽: 비디오 피드 */}
          <div className="col-span-2">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black bg-opacity-50 px-3 py-1 rounded-full">
                <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-sm font-medium">
                  {isRecording ? formatTime(currentTime) : '대기 중'}
                </span>
              </div>
            </div>
          </div>

          {/* 오른쪽: 질문 및 컨트롤 */}
          <div className="space-y-6">
            {!isRecording ? (
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">면접 준비</h2>
                <p className="text-gray-300 mb-6">
                  카메라와 마이크가 정상적으로 작동하는지 확인해주세요.
                  준비가 되면 '시작하기' 버튼을 클릭해주세요.
                </p>
                <Button
                  onClick={handleStartRecording}
                  className="w-full"
                  size="lg"
                >
                  면접 시작하기
                </Button>
              </div>
            ) : (
              <>
                <div className="bg-gray-800 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">현재 질문</h3>
                    <span className="text-sm text-gray-400">
                      {currentQuestion.type === 'technical' ? '기술' : '행동'} · {
                        currentQuestion.difficulty === 'easy' ? '초급' :
                        currentQuestion.difficulty === 'medium' ? '중급' : '고급'
                      }
                    </span>
                  </div>
                  <p className="text-gray-300">
                    {currentQuestion.text}
                  </p>
                </div>

                {nextQuestion && (
                  <div className="bg-gray-800 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">다음 질문</h3>
                      <span className="text-sm text-gray-400">
                        {nextQuestion.type === 'technical' ? '기술' : '행동'} · {
                          nextQuestion.difficulty === 'easy' ? '초급' :
                          nextQuestion.difficulty === 'medium' ? '중급' : '고급'
                        }
                      </span>
                    </div>
                    <p className="text-gray-300">
                      {nextQuestion.text}
                    </p>
                  </div>
                )}

                <div className="flex space-x-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleNextQuestion}
                    disabled={!nextQuestion}
                  >
                    다음 질문
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={handleEndInterview}
                  >
                    면접 종료
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 