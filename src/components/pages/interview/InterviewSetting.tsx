import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/Button';
import { Input } from '../../shared/Input';

interface InterviewSettings {
  position: string;
  duration: number;
  difficulty: string;
  focusArea: string[];
}

export const InterviewSetting: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<InterviewSettings>({
    position: '',
    duration: 30,
    difficulty: 'medium',
    focusArea: [],
  });

  const difficultyOptions = [
    { value: 'easy', label: '초급' },
    { value: 'medium', label: '중급' },
    { value: 'hard', label: '고급' },
  ];

  const focusAreas = [
    { value: 'technical', label: '기술 역량' },
    { value: 'problem-solving', label: '문제 해결 능력' },
    { value: 'communication', label: '의사소통 능력' },
    { value: 'experience', label: '프로젝트 경험' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Validate and process settings
    navigate('/interview/check-environment');
  };

  const handleFocusAreaChange = (value: string) => {
    setSettings(prev => ({
      ...prev,
      focusArea: prev.focusArea.includes(value)
        ? prev.focusArea.filter(v => v !== value)
        : [...prev.focusArea, value],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            면접 설정
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            면접을 시작하기 전에 아래 설정을 완료해주세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-lg shadow">
          <div>
            <Input
              label="지원 포지션"
              type="text"
              value={settings.position}
              onChange={(e) => setSettings(prev => ({ ...prev, position: e.target.value }))}
              placeholder="예: 프론트엔드 개발자"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              면접 시간
            </label>
            <select
              value={settings.duration}
              onChange={(e) => setSettings(prev => ({ ...prev, duration: Number(e.target.value) }))}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md"
            >
              <option value={15}>15분</option>
              <option value={30}>30분</option>
              <option value={45}>45분</option>
              <option value={60}>60분</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              난이도 설정
            </label>
            <div className="grid grid-cols-3 gap-4">
              {difficultyOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, difficulty: option.value }))}
                  className={`
                    py-3 px-4 border rounded-lg text-sm font-medium
                    ${settings.difficulty === option.value
                      ? 'bg-primary text-white border-transparent'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              중점 평가 영역
            </label>
            <div className="grid grid-cols-2 gap-4">
              {focusAreas.map(area => (
                <button
                  key={area.value}
                  type="button"
                  onClick={() => handleFocusAreaChange(area.value)}
                  className={`
                    py-3 px-4 border rounded-lg text-sm font-medium
                    ${settings.focusArea.includes(area.value)
                      ? 'bg-primary text-white border-transparent'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {area.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6">
            <Button
              type="submit"
              className="w-full"
              size="lg"
            >
              다음 단계로
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}; 