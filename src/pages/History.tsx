import React, { useState } from "react";
import { Download } from "lucide-react";
import { saveAs } from "file-saver";
import { Button } from "../components/shared/Button";

const rawData = [
  { date: "2025-06-07", score: 85, pdfUrl: "/pdfs/report-2025-06-07.pdf" },
  { date: "2025-06-01", score: 72, pdfUrl: "/pdfs/report-2025-06-01.pdf" },
];

const downloadPDF = (url: string, filename: string) => {
  saveAs(url, filename);
};

const getFaceImg = (score: number) => {
  if (score >= 80) return "/smile.png";
  if (score >= 50) return "/soso.png";
  return "/sad.png";
};

const History: React.FC = () => {
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filterDate, setFilterDate] = useState<string>("");

  const sorted = [...rawData].sort((a, b) =>
    sortOrder === "newest"
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date)
  );
  const data = filterDate
    ? sorted.filter((row) => row.date === filterDate)
    : sorted;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-center mb-6">내 면접 기록</h1>

      <div className="flex justify-between mb-6">
        <div>
          <Button
            variant={sortOrder === "newest" ? "primary" : "outline"}
            onClick={() => setSortOrder("newest")}
          >
            최신순
          </Button>
          <Button
            variant={sortOrder === "oldest" ? "primary" : "outline"}
            onClick={() => setSortOrder("oldest")}
            className="ml-2"
          >
            오래된 순
          </Button>
        </div>
        <div>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border rounded px-3 py-1"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate("")}
              className="ml-2 text-sm text-primary underline"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      <table className="min-w-full bg-white border">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-2 px-4 border">연습 날짜</th>
            <th className="py-2 px-4 border">다운로드</th>
            <th className="py-2 px-4 border">내 점수</th>
          </tr>
        </thead>
        <tbody>
          {data.length ? (
            data.map((row) => (
              <tr key={row.date} className="border-t">
                <td className="py-2 px-4">{row.date}</td>
                <td className="py-2 px-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      downloadPDF(row.pdfUrl, `${row.date}-report.pdf`)
                    }
                  >
                    <Download className="w-4 h-4 mr-1" /> PDF
                  </Button>
                </td>
                <td className="py-2 px-4">
                  <div className="flex items-center justify-center gap-2">
                    {row.score}점
                    <img
                      src={getFaceImg(row.score)}
                      alt="표정"
                      className="w-6 h-6"
                    />
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="py-4 text-center text-gray-500">
                해당 날짜의 기록이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default History;
