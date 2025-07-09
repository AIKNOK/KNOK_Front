import React, { useRef, useState } from "react";
import { Button } from "../../components/shared/Button";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import html2pdf from "html2pdf.js";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// 1. 더미 데이터 선언
const MOCK_FEEDBACK = {
  summary: "전체적으로 논리적인 답변과 침착한 태도가 돋보였습니다. 자기소개에서 자신만의 강점을 분명하게 언급한 점이 인상적이었으며, 꼬리 질문에도 당황하지 않고 차분하게 답변한 점이 좋았습니다.",
  detail: {
    "자기소개": "구체적인 경험을 잘 녹여서 자신을 소개한 점이 강점입니다.",
    "직무 역량": "기술적 역량에 대한 이해도가 충분히 드러났습니다.",
    "성장 경험": "실패 경험과 그로부터의 배움을 적극적으로 설명했습니다.",
    "커뮤니케이션": "질문자의 의도를 파악해 명확하게 답변을 제시했습니다.",
    "태도/자세": "면접 내내 자세를 바르게 유지하였고, 자신감이 느껴졌습니다."
  },
  chart: {
    "논리성": 4.5,
    "전문성": 4.0,
    "소통능력": 4.0,
    "태도": 4.5,
    "자기소개": 5.0
  },
  score: 90, // 80 이상이므로 smile.png
};

const MOCK_CLIPS = [
  {
    clipUrl: "https://knok-tts.s3.ap-northeast-2.amazonaws.com/dummy/clip1.webm",
    thumbnailUrl: "thumbnail.png", // public/thumbnail.png
    feedback: "시선이 잠깐 아래로 내려갔습니다. 답변 중간에도 정면을 바라보세요.",
  },
  {
    clipUrl: "https://knok-tts.s3.ap-northeast-2.amazonaws.com/dummy/clip2.webm",
    thumbnailUrl: "thumbnail.png",
    feedback: "어깨가 한쪽으로 기울어졌습니다. 바른 자세를 유지해주세요.",
  },
  {
    clipUrl: "https://knok-tts.s3.ap-northeast-2.amazonaws.com/dummy/clip3.webm",
    thumbnailUrl: "thumbnail.png",
    feedback: "손동작이 빈번하게 나타납니다. 필요할 때만 손동작을 사용하는 연습이 필요합니다.",
  },
];

// 2. ZIP 다운로드: 진짜 백엔드가 없으므로 더미 zip 생성 (간단하게 Blob으로!)
const createDummyZipBlob = () => {
  // 실제로는 zip 파일이어야 하지만, 데모용이니 텍스트 파일로 만듦
  const text = "이 파일은 데모용 ZIP 파일입니다.\n실제 분석 결과와는 무관합니다.";
  return new Blob([text], { type: "application/zip" });
};

const FeedbackReport: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPdfUploaded, setIsPdfUploaded] = useState(true); // PDF 업로드 항상 true(시연)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // pdf 생성용
  const reportRef = useRef<HTMLDivElement>(null);

  // PDF 다운로드/업로드: 실제 업로드 없이 Blob만 다운로드
  const handleGeneratePDF = async () => {
    if (!reportRef.current) return;
    const opt = {
      margin: 0,
      filename: "feedback.pdf",
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] as unknown as string[] },
    };
    await html2pdf().set(opt).from(reportRef.current).save();
  };

  // ZIP 다운로드 핸들러 (가짜)
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = createDummyZipBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `demo_feedback.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      alert("ZIP 다운로드 완료 (데모용)");
    } catch (err) {
      alert("다운로드 중 에러 발생: " + err);
    } finally {
      setIsDownloading(false);
    }
  };

  // 차트 옵션
  const chartOptions: ChartOptions<"radar"> = {
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
        position: "top",
        align: "end",
        labels: { font: { size: 14 } },
      },
    },
  };

  // 표정 이미지 (score 기준)
  const score = MOCK_FEEDBACK.score || 0;
  const expressionImg =
    score >= 80
      ? "/smile.png"
      : score >= 50
      ? "/soso.png"
      : "/sad.png";

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4 pt-12">
      <div className="text-right">
        <Button
          onClick={handleDownload}
          disabled={isDownloading || !isPdfUploaded}
        >
          {isDownloading ? "다운로드 중..." : "ZIP 다운로드"}
        </Button>
        <Button
          className="ml-2"
          onClick={handleGeneratePDF}
        >
          PDF로 저장
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
            <p>{MOCK_FEEDBACK.summary}</p>
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

        {/* 차트 */}
        <div className="p-4 border rounded mb-6">
          <h2 className="text-xl font-semibold text-center mb-2">
            면접 결과 분석
          </h2>
          <Radar
            data={{
              labels: Object.keys(MOCK_FEEDBACK.chart),
              datasets: [
                {
                  label: "면접 평가",
                  data: Object.values(MOCK_FEEDBACK.chart),
                  backgroundColor: "rgba(147, 51, 234, 0.4)",
                  borderColor: "#9333ea",
                  borderWidth: 2,
                },
              ],
            }}
            options={chartOptions}
          />
        </div>

        {/* 상세 분석 */}
        <div className="page-break">
          <div className="p-4 border rounded space-y-4">
            <h2 className="text-xl font-semibold text-center mb-2">
              상세 분석
            </h2>
            {Object.entries(MOCK_FEEDBACK.detail).map(([title, content]) => (
              <div key={title}>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="pl-2">{content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 썸네일 & 클립 */}
      {MOCK_CLIPS.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">추출된 클립</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MOCK_CLIPS.map((c, i) => (
              <div key={i} className="border rounded-lg p-4">
                <img
                  src={c.thumbnailUrl}
                  alt={`Clip ${i + 1}`}
                  className="w-full h-auto mb-2 rounded-md"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/no_thumbnail.png";
                  }}
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
