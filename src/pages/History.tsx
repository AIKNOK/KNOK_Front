import React, { useState, useEffect } from "react";
import axios from "axios";
import { Download } from "lucide-react";
import { saveAs } from "file-saver";
import { Button } from "../components/shared/Button";

interface FeedbackItem {
  created_at: string;
  total_score: number;
  pdf_url: string;
}

const downloadPDF = (url: string, filename: string) => {
  saveAs(url, filename);
};

const getFaceImg = (score: number) => {
  if (score >= 80) return "/smile.png";
  if (score >= 50) return "/soso.png";
  return "/sad.png";
};

const History: React.FC = () => {
  const [data, setData] = useState<FeedbackItem[]>([]);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filterDate, setFilterDate] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sort = "created_at";
        const order = sortOrder === "newest" ? "desc" : "asc";
        const token = localStorage.getItem("access_token");
        const res = await axios.get(`/api/feedback/history?sort=${sort}&order=${order}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log("📦 feedback response", res.data); 
        setData(res.data);
      } catch (err) {
        console.error("피드백 히스토리 불러오기 실패", err);
      }
    };
    fetchData();
  }, [sortOrder]);

  const filteredData = filterDate
    ? data.filter((item) => item.created_at.slice(0, 10) === filterDate)
    : data;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-center mb-6">내 면접 기록</h1>

      <div className="flex justify-between mb-6 flex-wrap gap-4">
        {/* 정렬 버튼 */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={sortBy === "created_at" && sortOrder === "desc" ? "primary" : "outline"}
            onClick={() => setSort("created_at", "desc")}
          >
            최신순
          </Button>
          <Button
            variant={sortBy === "created_at" && sortOrder === "asc" ? "primary" : "outline"}
            onClick={() => setSort("created_at", "asc")}
          >
            오래된 순
          </Button>
          <Button
            variant={sortBy === "score" && sortOrder === "desc" ? "primary" : "outline"}
            onClick={() => setSort("score", "desc")}
          >
            점수 높은 순
          </Button>
          <Button
            variant={sortBy === "score" && sortOrder === "asc" ? "primary" : "outline"}
            onClick={() => setSort("score", "asc")}
          >
            점수 낮은 순
          </Button>
        </div>

        {/* 날짜 필터 */}
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

      {/* 테이블 */}
      <table className="min-w-full bg-white border">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-2 px-4 border">연습 날짜</th>
            <th className="py-2 px-4 border">다운로드</th>
            <th className="py-2 px-4 border">내 점수</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.length ? (
            filteredData.map((row, index) => (
              <tr key={index} className="border-t">
                <td className="py-2 px-4">{row.created_at.slice(0, 10)}</td>
                <td className="py-2 px-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      downloadPDF(row.pdf_url, `${row.created_at.slice(0, 10)}-report.pdf`)
                    }
                  >
                    <Download className="w-4 h-4 mr-1" /> PDF
                  </Button>
                </td>
                <td className="py-2 px-4">
                  <div className="flex items-center justify-center gap-2">
                    {row.total_score}점
                    <img
                      src={getFaceImg(row.total_score)}
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