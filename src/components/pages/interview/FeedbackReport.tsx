// FeedbackReport.tsx

import React, { useRef } from 'react';
import { Button } from '../../shared/Button';
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
  Tick,
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

const FeedbackReport: React.FC = () => {
  const reportRef = useRef<HTMLDivElement>(null);

  const data = {
    summary: '몰입도 높았고, 자신감 있는 자세가 인상적이었습니다.',
    score: 85,
    detail: {
      일관성: '전체 흐름에 일관성이 있으며, 중복 없이 답변함.',
      논리성: '이유와 근거가 명확하여 논리적으로 전달됨.',
      대처능력: '예상치 못한 질문에도 침착하게 대처함.',
      구체성: '구체적인 사례를 제시하여 설득력을 높임.',
      말하기방식: '말 속도가 일정하고 발음이 정확함.',
      면접태도: '자신감 있으나 다소 긴장한 모습이 있었음.',
    },
    chart: {
      일관성: 4,
      논리성: 4.5,
      대처능력: 4,
      구체성: 3.5,
      말하기방식: 4,
      면접태도: 3.5,
    },
  };

  const expressionImg =
    data.score >= 80
      ? '/smile.png'
      : data.score >= 50
      ? '/soso.png'
      : '/sad.png';

  const chartData = {
    labels: Object.keys(data.chart),
    datasets: [
      {
        label: '면접 평가',
        data: Object.values(data.chart),
        backgroundColor: 'rgba(147, 51, 234, 0.4)',
        borderColor: '#9333ea',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions: ChartOptions<'radar'> = {
    scales: {
      r: {
        min: 0,
        max: 5,
        ticks: {
          stepSize: 1,
          callback: (tickValue: string | number): string => {
            return typeof tickValue === 'number'
              ? tickValue.toFixed(0)
              : String(tickValue);
          },
        },
        pointLabels: {
          font: { size: 16 },
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          font: { size: 14 },
        },
      },
    },
  };

  const handleDownloadPDF = () => {
    if (!reportRef.current) return;

    const element = reportRef.current;
    const opt = {
      margin: 0.5,
      filename: 'interview-feedback.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }, // 자동 페이지 분할
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 pt-24">
      <div className="text-right">
        <Button onClick={handleDownloadPDF}>PDF 저장</Button>
      </div>

      <div ref={reportRef} className="space-y-8 bg-white shadow rounded-xl p-6">
        <h1 className="text-3xl font-bold text-center">피드백 리포트</h1>

        <div className="grid grid-cols-10 gap-4">
          <div className="col-span-7 p-4 border rounded">
            <h2 className="text-xl font-semibold mb-2 text-center">종합 소견</h2>
            <p>{data.summary}</p>
          </div>
          <div className="col-span-3 p-4 border rounded flex flex-col items-center justify-center">
            <h2 className="text-xl font-semibold mb-2">면접관 표정</h2>
            <img src={expressionImg} alt="표정" className="w-24 h-24" />
          </div>
        </div>

        <div className="p-4 border rounded mb-6">
          <h2 className="text-xl font-semibold text-center mb-2">면접 결과 분석</h2>
          <Radar data={chartData} options={chartOptions} />
        </div>

        <div className="p-4 border rounded space-y-4">
          <h2 className="text-xl font-semibold text-center mb-2">상세 분석</h2>
          {Object.entries(data.detail).map(([title, content]) => (
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
