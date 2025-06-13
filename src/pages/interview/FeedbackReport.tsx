import React, { useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';   
import { Button } from '../../components/shared/Button';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import html2pdf from 'html2pdf.js';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface FeedbackDetail {
  [key: string]: string;
}
interface FeedbackChart {
  [key: string]: number;
}
interface FeedbackResponse {
  summary?: string;
  detail?: Record<string,string>;
  chart?: Record<string,number>;
  score?: number;
  error?: string;
  raw?: string;
}
const API_BASE = import.meta.env.VITE_API_BASE_URL;

const FeedbackReport: React.FC = () => {

  const location = useLocation();
  const { analysis, upload_id, email_prefix } = (location.state ?? {}) as {
    analysis: any;
    upload_id: string;
    email_prefix?: string;
  };

  const reportRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // PDF 다운로드에 필요한 값
  const { state } = useLocation();
  const videoId: string = state?.videoId;
  const segments: any[] = state?.segments;
  const feedbackText: string = state?.feedbackText;
  const [isDownloading, setIsDownloading] = useState(false);

  // 1) 피드백 생성 API 호출
  useEffect(() => {
    if (!analysis) return;
    const fetchFeedback = async () => {
      setLoading(true);
      try {
        const token =
          localStorage.getItem('id_token') ||
          localStorage.getItem('access_token') ||
          '';
        const res = await fetch(
          `${API_BASE}/interview/feedback/generate/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ analysis, email_prefix, upload_id }),
          }
        );
        if (!res.ok) throw new Error(`서버 에러 ${res.status}`);
        const data = await res.json();
        console.log("❗️ generate_feedback_report 응답:", data);
        setFeedback(data);
      } catch (err) {
        console.error('피드백 불러오기 실패:', err);
        // 서버에서 { error, raw } 형태로 내려왔다면 feedback에 담아두고
        setFeedback((prev) => ({ ...(prev as any), error: (err as Error).message }));
      } finally {
        setLoading(false);
      }
    };
    fetchFeedback();
  }, [analysis, email_prefix, upload_id]);

  // 2) ZIP 다운로드 핸들러
  const handleDownload = async () => {
    if (!videoId || !segments || !feedbackText) {
      alert('다운로드 정보가 부족합니다.');
      return;
    }
    setIsDownloading(true);
    try {
      const token =
        localStorage.getItem('id_token') ||
        localStorage.getItem('access_token') ||
        '';
      const res = await fetch(`${API_BASE}/video/extract-clips/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          segments,
          feedback_text: feedbackText,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        alert('다운로드 실패\n' + err);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${videoId}_feedback.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      alert('다운로드 중 에러 발생: ' + err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-6">피드백 로딩 중...</div>;
  }
  
  if (feedback?.error) {
    return (
      <div className="text-center p-6 text-red-500">
        피드백 생성 중 오류 발생:<br />
        {feedback.error}<br />
        (원시 응답: {feedback.raw?.slice(0, 100)}…)
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="text-center p-6 text-red-500">
        피드백을 불러오지 못했습니다.
      </div>
    );
  }

  // 3) 비구조화 + 기본값
  const {
    summary = '',
    detail = {},
    chart = {},
    score = 0,
  } = feedback;

  // 4) 차트 데이터 유무
  const hasChartData = Object.keys(chart).length > 0;

  // 5) 차트 옵션 (반드시 JSX보다 위에 선언!)
  const chartOptions: ChartOptions<'radar'> = {
    scales: {
      r: {
        min: 0,
        max: 5,
        ticks: { stepSize: 1 },
        pointLabels: { font: { size: 16 } },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: { font: { size: 14 } },
      },
    },
  };

  // 6) 표정 이미지 결정
  const expressionImg =
    score >= 80
      ? '/smile.png'
      : score >= 50
      ? '/soso.png'
      : '/sad.png';

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 pt-24">
      <div className="text-right">
        <Button onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? '다운로드 중...' : 'ZIP 다운로드'}
        </Button>
      </div>

      <div
        ref={reportRef}
        className="space-y-8 bg-white shadow rounded-xl p-6"
      >
        <h1 className="text-3xl font-bold text-center">피드백 리포트</h1>

        {/* 종합 소견 + 면접관 표정 */}
        <div className="grid grid-cols-10 gap-4">
          <div className="col-span-7 p-4 border rounded">
            <h2 className="text-xl font-semibold mb-2 text-center">
              종합 소견
            </h2>
            <p>{summary}</p>
          </div>
          <div className="col-span-3 p-4 border rounded flex flex-col items-center justify-center">
            <h2 className="text-xl font-semibold mb-2">면접관 표정</h2>
            <img
              src={expressionImg}
              alt="표정"
              className="w-24 h-24"
            />
          </div>
        </div>

        {/* 조건부 렌더링: 차트 */}
        {hasChartData ? (
          <div className="p-4 border rounded mb-6">
            <h2 className="text-xl font-semibold text-center mb-2">
              면접 결과 분석
            </h2>
            <Radar
              data={{
                labels: Object.keys(chart),
                datasets: [
                  {
                    label: '면접 평가',
                    data: Object.values(chart),
                    backgroundColor: 'rgba(147, 51, 234, 0.4)',
                    borderColor: '#9333ea',
                    borderWidth: 2,
                  },
                ],
              }}
              options={chartOptions}
            />
          </div>
        ) : (
          <div className="text-center text-gray-500 py-6">
            아직 차트 데이터가 없습니다.
          </div>
        )}

        {/* 상세 분석 */}
        <div className="p-4 border rounded space-y-4">
          <h2 className="text-xl font-semibold text-center mb-2">
            상세 분석
          </h2>
          {Object.entries(detail).map(([title, content]) => (
            <div key={title}>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="pl-2">{content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeedbackReport;
