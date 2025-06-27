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
import { useAuth } from '../../contexts/AuthContext';

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { token } = useAuth();

  // PDF 업로드 완료를 추적
  const [isPdfUploaded, setIsPdfUploaded] = useState(false);

  // ZIP 다운로드용
  const reportRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // PDF 다운로드에 필요한 값
  const location = useLocation();
  const {
    analysis,
    upload_id,     // 이제 videoId 역할
    email_prefix,
    feedbackText,
  } = (location.state ?? {}) as {
    analysis: any;
    upload_id: string;
    email_prefix?: string;
    feedbackText: string;
  };
  console.log("[FeedbackReport] 전달받은 state:", location.state);
  const [isDownloading, setIsDownloading] = useState(false);

  // 피드백 prsighned URL 제공
  const [clips, setClips] = useState<
    { clipUrl: string; thumbnailUrl: string; feedback: string }[]
  >([]);

  // 차트를 이미지로 변환
  const chartRef = useRef<any>(null);
  const prepareChartImage = () => {
    const chartInst = chartRef.current;
    if (!chartInst) return;
    const base64 = chartInst.toBase64Image();
    const img = document.createElement('img');
    img.src = base64;
    img.style.width = '100%';
    img.style.height = 'auto';
    const container = document.getElementById('chart-container');
    if (container) {
      container.innerHTML = '';
      container.appendChild(img);
    }
  };

  // pdf 변환
  const generatePDFBlob = async (): Promise<Blob> => {
    if (!reportRef.current) throw new Error("리포트 DOM이 없습니다.");

    const opt = {
      margin: 0,
      filename: 'feedback.pdf',
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] as unknown as string[] },
    };

    const pdfBlob: Blob = await html2pdf()
      .set(opt)
      .from(reportRef.current)
      .outputPdf('blob');

    return pdfBlob;
  };
  
  // PDF 업로드
  const handleGenerateAndUploadPDF = async () => {
  try {
    const blob = await generatePDFBlob();

    const formData = new FormData();
    formData.append('pdf', blob, 'feedback_report.pdf');
    formData.append('video_Id', upload_id);

    if (!token) {
      throw new Error('인증 토큰이 없습니다.');
    }

    const res = await fetch(`${API_BASE}/upload/pdf/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!res.ok) throw new Error('PDF 업로드 실패');

    const data: { pdf_url: string } = await res.json();
    setPdfUrl(data.pdf_url);
    return data;
  } catch (e: any) {
    console.error('PDF 생성 또는 업로드 실패', e);
    throw e;
  }
};

  // 2) ZIP 다운로드 핸들러
  const handleDownload = async () => {
    if (!upload_id) {
      alert('videoId가 필요합니다.');
      return;
    }
    setIsDownloading(true);
    try {
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }
      const res = await fetch(`${API_BASE}/download/feedback-zip/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId:upload_id,
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
      a.download = `${upload_id}_feedback.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      alert('ZIP 다운로드 완료');
    } catch (err) {
      alert('다운로드 중 에러 발생: ' + err);
    } finally {
      setIsDownloading(false);
    }
  };

  // 메인 로직
  useEffect(() => {
    if (!analysis) {
      console.error("❌ analysis 없음");
      return;
    }
    console.log("📦 analysis 데이터:", analysis);
    const fetchFeedback = async () => {
      setLoading(true);
      try {
        // 피드백 생성
        if (!token) {
          throw new Error('인증 토큰이 없습니다.');
        }
        const fRes = await fetch(
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
        console.log("[FeedbackReport] generate 호출 body:", { analysis, email_prefix, upload_id });
        if (!fRes.ok) throw new Error(`서버 에러 ${fRes.status}`);
        const data = await fRes.json();
        console.log("❗️ generate_feedback_report 응답:", data);
        console.log("[FeedbackReport] 서버에서 받은 피드백:", data);
        setFeedback(data);

        // 자세 문제에 따른 피드백 생성 함수 추가
        const generatePostureFeedback = (reason: string): string => {
          switch(reason) {
            case 'shoulder':
              return '어깨 자세가 바르지 않습니다. 어깨를 펴고 바른 자세를 유지하세요.';
            case 'headDown':
              return '고개를 숙이고 있습니다. 시선을 정면으로 유지하세요.';
            case 'ear':
              return '귀를 만지는 습관이 있습니다. 면접 중 불필요한 동작을 자제하세요.';
            case 'gaze':
              return '시선이 불안정합니다. 면접관을 바라보며 자신감 있는 태도를 보이세요.';
            default:
              return '자세를 바르게 유지하세요.';
          }
        };

        // bad_posture_clips API 호출
        try {
          const clipsRes = await fetch(`${API_BASE}/video/get-clips-and-segments/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ interview_id: upload_id }),
          });

          if (!clipsRes.ok) {
            throw new Error(`Failed to fetch clips and segments: ${clipsRes.statusText}`);
          }
          const clipsData = await clipsRes.json();
          setClips(clipsData.clips || []);
          // Note: segments are not directly set here as they're not used in the current UI after being fetched.
        } catch (clipFetchError) {
          console.error("Error fetching clips and segments:", clipFetchError);
          setClips([]);
        }

        // 자동 PDF 생성 및 업로드
        setTimeout(async () => {
          try {
            const { pdf_url } = await handleGenerateAndUploadPDF();  // ← 여기가 { url: S3_URL } 리턴하는 부분
            setPdfUrl(pdf_url); // 저장된 S3 URL 백엔드로 다시 전달하기 위함
            setIsPdfUploaded(true); // PDF 업로드 완료 표시
            console.log("PDF 업로드 완료:", pdf_url);
          } catch (e) {
            console.error("PDF 생성 또는 업로드 실패", e);
          }
        }, 1000);
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
    <div className="max-w-3xl mx-auto p-6 space-y-4 pt-12">
      <div className="text-right">
        <Button onClick={handleDownload} disabled={isDownloading || !isPdfUploaded}>
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
              ref={chartRef}
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
        {/* 페이지 브레이크 */}
        <div className="page-break">

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
      {feedback?.error && (
        <div className="text-red-500">{feedback.error}</div>
      )}

      {/* ─── ④ 썸네일 & 링크 렌더링 ─────────────────── */}
      {clips.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">추출된 클립</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {clips.map((c, i) => (
              <div key={i} className="border rounded-lg p-4">
                <img
                  src={c.thumbnailUrl}
                  alt={`Clip ${i + 1}`}
                  className="w-full h-auto mb-2 rounded-md"
                />
                <a
                  href={c.clipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline"
                >
                  클립 {i + 1} 보기
                </a>
                {c.feedback && (
                  <p className="mt-2 text-sm text-gray-600">{c.feedback}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default FeedbackReport;