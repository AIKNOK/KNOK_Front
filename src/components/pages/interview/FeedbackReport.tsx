import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/Button';

interface FeedbackItem {
  category: string;
  score: number;
  feedback: string;
  recommendations: string[];
}

interface Answer {
  question: string;
  answer: string;
  feedback: string;
  score: number;
}

export const FeedbackReport: React.FC = () => {
  const navigate = useNavigate();

  const overallScore = 85;
  
  const feedbackItems: FeedbackItem[] = [
    {
      category: '전문성',
      score: 90,
      feedback: '기술적 지식과 실무 경험이 잘 드러났습니다.',
      recommendations: [
        '최신 기술 트렌드에 대한 관심을 유지하세요.',
        '실제 프로젝트 경험을 더 구체적으로 설명하면 좋겠습니다.',
      ],
    },
    {
      category: '의사소통',
      score: 85,
      feedback: '명확하고 논리적인 답변을 제시했습니다.',
      recommendations: [
        '기술적 용어 설명 시 더 쉬운 예시를 활용해보세요.',
        '답변 시간 배분을 더 효율적으로 해보세요.',
      ],
    },
    {
      category: '문제해결',
      score: 80,
      feedback: '체계적인 접근 방식을 보여주었습니다.',
      recommendations: [
        '다양한 해결 방안을 더 제시해보세요.',
        '시간/공간 복잡도를 고려한 설명을 추가해보세요.',
      ],
    },
  ];

  const answers: Answer[] = [
    {
      question: '자신이 참여했던 프로젝트 중 가장 도전적이었던 경험에 대해 설명해주세요.',
      answer: '레거시 코드 리팩토링 프로젝트에서...',
      feedback: '구체적인 문제 해결 과정과 결과가 잘 설명되었습니다.',
      score: 90,
    },
    {
      question: 'React의 가상 DOM(Virtual DOM)에 대해 설명해주세요.',
      answer: '가상 DOM은 실제 DOM의 가벼운 복사본으로...',
      feedback: '개념은 정확하나 실제 사용 사례가 부족했습니다.',
      score: 85,
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 80) return 'text-blue-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '🌟';
    if (score >= 80) return '👍';
    if (score >= 70) return '🔨';
    return '📚';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            면접 피드백 리포트
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            면접 결과를 분석하여 상세한 피드백을 제공해드립니다
          </p>
        </div>

        {/* 전체 점수 */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              종합 평가
            </h2>
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-primary bg-opacity-10">
              <span className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}점
              </span>
            </div>
          </div>
        </div>

        {/* 카테고리별 피드백 */}
        <div className="grid gap-8 mb-12">
          {feedbackItems.map((item, index) => (
            <div key={index} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  {item.category}
                </h3>
                <span className={`text-2xl font-bold ${getScoreColor(item.score)}`}>
                  {getScoreEmoji(item.score)} {item.score}점
                </span>
              </div>
              <p className="text-gray-700 mb-4">{item.feedback}</p>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  개선을 위한 제안
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {item.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-gray-600 text-sm">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* 질문별 피드백 */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            질문별 피드백
          </h2>
          <div className="space-y-8">
            {answers.map((answer, index) => (
              <div key={index} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Q{index + 1}. {answer.question}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      답변: {answer.answer}
                    </p>
                    <p className="text-gray-700">
                      {answer.feedback}
                    </p>
                  </div>
                  <span className={`ml-4 text-lg font-semibold ${getScoreColor(answer.score)}`}>
                    {answer.score}점
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/library')}
          >
            학습 자료 보기
          </Button>
          <Button
            onClick={() => navigate('/MyPage')}
          >
            다시 도전하기
          </Button>
        </div>
      </div>
    </div>
  );
}; 