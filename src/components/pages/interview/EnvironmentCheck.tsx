import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/Button';

export const EnvironmentCheck: React.FC = () => {
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const [videoConnected, setVideoConnected] = useState(false);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [micConnected, setMicConnected] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  // 초기: 카메라 연결 및 마이크 권한/디바이스 조회
  useEffect(() => {
    const initCamera = async () => {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = camStream;
        setVideoConnected(true);
      } catch (e) {
        console.error('카메라 연결 실패', e);
        setVideoConnected(false);
      }
    };
    const initMicrophones = async () => {
      try {
        const audioPerm = await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        setMicDevices(mics);
        if (mics.length) setSelectedMicId(mics[0].deviceId);
        audioPerm.getTracks().forEach(t => t.stop());
      } catch (e) {
        console.error('오디오 권한/디바이스 조회 실패', e);
      }
    };
    initCamera();
    initMicrophones();
  }, []);

  // 마이크 연결 및 볼륨 게이지
  const startMicVisualization = async (deviceId: string) => {
    try {
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      audioContextRef.current?.close();

      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } });
      micStreamRef.current = audioStream;
      const context = new AudioContext();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(audioStream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
        const percent = Math.min(100, (avg / 255) * 100);
        setMicLevel(percent);
        requestAnimationFrame(draw);
      };
      draw();
      setMicConnected(true);
    } catch (e) {
      console.error('마이크 연결/시각화 실패', e);
      setMicConnected(false);
    }
  };

  const handleMicConnect = () => {
    if (selectedMicId) {
      startMicVisualization(selectedMicId);
    }
  };

  const handleStart = () => {
    if (videoConnected && micConnected) {
      navigate('/interview/session');
    }
  };

  const currentMicLabel = micDevices.find(m => m.deviceId === selectedMicId)?.label || '';

  return (
    <div className="min-h-screen bg-gray-50 pt-[132px] pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">환경 점검</h1>
          <p className="mt-3 text-lg text-gray-500">카메라 및 마이크를 선택하고 연결을 확인하세요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white shadow rounded-lg p-6">
          {/* 카메라 */}
          <div>
            <div className="aspect-video bg-black rounded-md overflow-hidden">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
            <p className="mt-4 text-sm text-gray-600">
              {videoConnected ? '카메라 연결됨' : '카메라 연결 실패'}
            </p>
          </div>

          {/* 마이크 */}
          <div>
            <label htmlFor="micSelect" className="block text-sm font-medium text-gray-700">마이크 선택</label>
            <select
              id="micSelect"
              value={selectedMicId}
              onChange={e => setSelectedMicId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary/50"
            >
              {micDevices.map(m => (
                <option key={m.deviceId} value={m.deviceId}>{m.label || '알 수 없는 마이크'}</option>
              ))}
            </select>

            <div className="mt-4 flex items-center gap-2">
              <Button onClick={handleMicConnect}>연결 확인</Button>
              {micConnected && (
                <>
                  <span className="text-green-600 font-semibold">✔ 연결 완료</span>
                  <span className="ml-2 text-sm text-gray-700">{currentMicLabel}</span>
                </>
              )}
            </div>

            {micConnected && (
              <div className="mt-4">
                <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${micLevel}%` }}
                  />
                </div>
              </div>
            )}

            <ul className="mt-4 text-sm text-gray-600 list-disc list-inside">
              <li>소음이 적은 환경에서 진행하세요.</li>
              <li>마이크 음량을 확인하세요.</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <Button variant="outline" onClick={() => navigate(-1)}>이전으로</Button>
          <Button onClick={handleStart} disabled={!(videoConnected && micConnected)}>AI 면접 시작하기</Button>
        </div>
      </div>
    </div>
  );
};