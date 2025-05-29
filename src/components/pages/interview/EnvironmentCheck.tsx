// src/components/pages/interview/EnvironmentCheck.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/Button';

interface CheckItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'checking' | 'success' | 'error';
  errorMessage?: string;
}

export const EnvironmentCheck: React.FC = () => {
  const navigate = useNavigate();
  const [checkItems, setCheckItems] = useState<CheckItem[]>([
    {
      id: 'camera',
      title: '카메라 연결 상태',
      description: '카메라가 정상적으로 연결되어 있는지 확인합니다.',
      status: 'pending',
    },
    {
      id: 'microphone',
      title: '마이크 연결 상태',
      description: '마이크가 정상적으로 연결되어 있는지 확인합니다.',
      status: 'pending',
    },
    {
      id: 'browser',
      title: '브라우저 호환성',
      description: '현재 브라우저가 지원되는지 확인합니다.',
      status: 'pending',
    }
  ]);

  const [isAllChecked, setIsAllChecked] = useState(false);

  useEffect(() => {
    const checkEnvironment = async () => {
      // 카메라 체크
      try {
        setCheckItems(prev =>
          prev.map(item =>
            item.id === 'camera' ? { ...item, status: 'checking' } : item
          )
        );
        await navigator.mediaDevices.getUserMedia({ video: true });
        setCheckItems(prev =>
          prev.map(item =>
            item.id === 'camera' ? { ...item, status: 'success' } : item
          )
        );
      } catch {
        setCheckItems(prev =>
          prev.map(item =>
            item.id === 'camera'
              ? { ...item, status: 'error', errorMessage: '카메라를 찾을 수 없습니다.' }
              : item
          )
        );
      }

      // 마이크 체크
      try {
        setCheckItems(prev =>
          prev.map(item =>
            item.id === 'microphone' ? { ...item, status: 'checking' } : item
          )
        );
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setCheckItems(prev =>
          prev.map(item =>
            item.id === 'microphone' ? { ...item, status: 'success' } : item
          )
        );
      } catch {
        setCheckItems(prev =>
          prev.map(item =>
            item.id === 'microphone'
              ? { ...item, status: 'error', errorMessage: '마이크를 찾을 수 없습니다.' }
              : item
          )
        );
      }

      // 브라우저 체크
      const isChrome = navigator.userAgent.includes('Chrome');
      setCheckItems(prev =>
        prev.map(item =>
          item.id === 'browser'
            ? {
                ...item,
                status: isChrome ? 'success' : 'error',
                errorMessage: isChrome ? undefined : 'Chrome 브라우저를 사용해주세요.'
              }
            : item
        )
      );
    };

    checkEnvironment();
  }, []);

  useEffect(() => {
    setIsAllChecked(checkItems.every(item => item.status === 'success'));
  }, [checkItems]);

  const getStatusIcon = (status: CheckItem['status']) => {
    switch (status) {
      case 'pending':   return '⏳';
      case 'checking':  return '🔄';
      case 'success':   return '✅';
      case 'error':     return '❌';
      default:          return '⏳';
    }
  };

  const handleStart = () => {
    if (isAllChecked) navigate('/interview/session');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            환경 점검
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            원활한 면접 진행을 위해 아래 항목들을 확인합니다
          </p>
        </div>

        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          {checkItems.map(item => (
            <div key={item.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-4">
                    {getStatusIcon(item.status)}
                  </span>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.description}</p>
                    {item.status === 'error' && item.errorMessage && (
                      <p className="mt-1 text-sm text-red-600">{item.errorMessage}</p>
                    )}
                  </div>
                </div>
                {item.status === 'error' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    다시 시도
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            이전으로
          </Button>
          <Button onClick={handleStart} disabled={!isAllChecked}>
            면접 시작하기
          </Button>
        </div>
      </div>
    </div>
  );
};
