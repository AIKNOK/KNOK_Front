import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';

interface InterviewHistory {
  id: string;
  date: string;
  position: string;
  duration: number;
  score: number;
  status: 'completed' | 'in-progress';
}

interface UserProfile {
  name: string;
  email: string;
  position: string;
  company: string;
  careerYears: number;
  profileImage: string;
}

export const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');
  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({
    name: '홍길동',
    email: 'hong@example.com',
    position: '프론트엔드 개발자',
    company: '테크 컴퍼니',
    careerYears: 3,
    profileImage: 'https://via.placeholder.com/150',
  });

  const [interviewHistory] = useState<InterviewHistory[]>([
    {
      id: '1',
      date: '2024-03-15',
      position: '시니어 프론트엔드 개발자',
      duration: 30,
      score: 85,
      status: 'completed',
    },
    {
      id: '2',
      date: '2024-03-10',
      position: '프론트엔드 리드',
      duration: 45,
      score: 92,
      status: 'completed',
    },
    {
      id: '3',
      date: '2024-03-05',
      position: '풀스택 개발자',
      duration: 30,
      score: 78,
      status: 'completed',
    },
  ]);

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement profile update logic
    setIsEditing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* 탭 네비게이션 */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                className={`
                  w-1/2 py-4 px-1 text-center border-b-2 text-sm font-medium
                  ${activeTab === 'profile'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                onClick={() => setActiveTab('profile')}
              >
                프로필
              </button>
              <button
                className={`
                  w-1/2 py-4 px-1 text-center border-b-2 text-sm font-medium
                  ${activeTab === 'history'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                onClick={() => setActiveTab('history')}
              >
                면접 기록
              </button>
            </nav>
          </div>

          {/* 프로필 탭 */}
          {activeTab === 'profile' && (
            <div className="p-8">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <img
                    src={profile.profileImage}
                    alt="Profile"
                    className="h-32 w-32 rounded-full object-cover"
                  />
                </div>
                <div className="ml-6 flex-1">
                  {!isEditing ? (
                    <>
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                          {profile.name}
                        </h2>
                        <p className="text-gray-500">{profile.email}</p>
                      </div>
                      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">직무</dt>
                          <dd className="mt-1 text-sm text-gray-900">{profile.position}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">회사</dt>
                          <dd className="mt-1 text-sm text-gray-900">{profile.company}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">경력</dt>
                          <dd className="mt-1 text-sm text-gray-900">{profile.careerYears}년</dd>
                        </div>
                      </dl>
                      <div className="mt-6">
                        <Button
                          variant="outline"
                          onClick={() => setIsEditing(true)}
                        >
                          프로필 수정
                        </Button>
                      </div>
                    </>
                  ) : (
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                      <Input
                        label="이름"
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                      <Input
                        label="이메일"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                      <Input
                        label="직무"
                        type="text"
                        value={profile.position}
                        onChange={(e) => setProfile(prev => ({ ...prev, position: e.target.value }))}
                        required
                      />
                      <Input
                        label="회사"
                        type="text"
                        value={profile.company}
                        onChange={(e) => setProfile(prev => ({ ...prev, company: e.target.value }))}
                        required
                      />
                      <Input
                        label="경력"
                        type="number"
                        value={profile.careerYears}
                        onChange={(e) => setProfile(prev => ({ ...prev, careerYears: Number(e.target.value) }))}
                        min="0"
                        required
                      />
                      <div className="flex space-x-4">
                        <Button
                          type="submit"
                          className="flex-1"
                        >
                          저장
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setIsEditing(false)}
                        >
                          취소
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 면접 기록 탭 */}
          {activeTab === 'history' && (
            <div className="p-8">
              <div className="space-y-6">
                {interviewHistory.map(interview => (
                  <div
                    key={interview.id}
                    className="bg-gray-50 rounded-lg p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {interview.position}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(interview.date).toLocaleDateString('ko-KR')} · {interview.duration}분
                        </p>
                      </div>
                      <span className={`text-lg font-semibold ${getScoreColor(interview.score)}`}>
                        {interview.score}점
                      </span>
                    </div>
                    <div className="flex justify-end space-x-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/interview/feedback/${interview.id}`)}
                      >
                        피드백 보기
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => navigate('/interview/setting')}
                      >
                        다시 도전하기
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 