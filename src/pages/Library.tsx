import React, { useState } from 'react';
import { Input } from "../components/shared/Input";
import { Button } from "../components/shared/Button";
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver'; // 설치 필요: npm install file-saver

const rawData = [
  { date: '2025-06-07', score: 85, pdfUrl: '/pdfs/report-2025-06-07.pdf' },
  { date: '2025-06-01', score: 72, pdfUrl: '/pdfs/report-2025-06-01.pdf' },
];

const downloadPDF = (url: string, filename: string) => {
  // 필요한 경우 여기에 로깅이나 에러 핸들링 추가 가능
  console.log('Downloading:', filename);
  saveAs(url, filename);
};

const getFaceImg = (score: number): string => {
  if (score >= 80) return '/smile.png';
  if (score >= 50) return '/soso.png';
  return '/sad.png';
};

const InterviewHistory: React.FC = () => {
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const sortedData = [...rawData].sort((a, b) =>
    sortOrder === 'newest'
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date)
  );

  const filteredData = selectedDate
    ? sortedData.filter((item) => item.date === selectedDate)
    : sortedData;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-center mb-6">내 면접 기록</h1>

      {/* 정렬 및 날짜 필터 */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex gap-2">
          <Button
            variant={sortOrder === 'newest' ? 'primary' : 'outline'}
            onClick={() => setSortOrder('newest')}
          >
            최신순
          </Button>
          <Button
            variant={sortOrder === 'oldest' ? 'primary' : 'outline'}
            onClick={() => setSortOrder('oldest')}
          >
            오래된 순
          </Button>
        </div>
        <div>
          <input
            type="date"
            onChange={(e) => setSelectedDate(e.target.value || null)}
            className="border rounded px-3 py-1"
          />
          {selectedDate && (
            <button
              className="ml-2 text-sm text-blue-600 underline"
              onClick={() => setSelectedDate(null)}
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full text-center border">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="py-3 px-4 border">연습 날짜</th>
              <th className="py-3 px-4 border">다운로드</th>
              <th className="py-3 px-4 border">내 점수</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((item, idx) => (
                <tr key={idx} className="border-t">
                  <td className="py-3 px-4 border">{item.date}</td>
                  <td className="py-3 px-4 border">
                    <Button
                      variant="outline"
                      onClick={() => downloadPDF(item.pdfUrl, `${item.date}-report.pdf`)}
                    >
                      <Download className="w-4 h-4 mr-1" /> PDF
                    </Button>
                  </td>
                  <td className="py-3 px-4 border">
                    <div className="flex items-center justify-center gap-2">
                      <span>{item.score}점</span>
                      <img src={getFaceImg(item.score)} alt="표정" className="w-6 h-6" />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-4 text-gray-500">
                  해당 날짜의 기록이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InterviewHistory;