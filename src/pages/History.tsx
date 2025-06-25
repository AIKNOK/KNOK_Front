import React, { useState, useEffect } from "react";
import axios from "axios";
import { Download, Loader } from "lucide-react";
import { saveAs } from "file-saver";
import { Button } from "../components/shared/Button";
import { useAuth } from "../contexts/AuthContext";

interface FeedbackItem {
  video_id: string;
  created_at: string;
  total_score: number;
  pdf_url: string;
}


const getFaceImg = (score: number) => {
  if (score >= 80) return "/smile.png";
  if (score >= 50) return "/soso.png";
  return "/sad.png";
};

const History: React.FC = () => {
  const [data, setData] = useState<FeedbackItem[]>([]);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filterDate, setFilterDate] = useState<string>("");
  const [loadingVideoId, setLoadingVideoId] = useState<string | null>(null);
  const auth = useAuth();
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sort = "created_at";
        const order = sortOrder === "newest" ? "desc" : "asc";
        const token = auth.token;
        if (!token) {
          console.warn("No token found for history fetch.");
          return;
        }
        const res = await axios.get(`${API_BASE}/feedback/history?sort=${sort}&order=${order}`, {
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
  }, [sortOrder, auth.token]);

  const filteredData = filterDate
  ? data.filter((item) => {
      const itemDate = new Date(item.created_at).toISOString().slice(0, 10);
      return itemDate === filterDate;
    })
  : data;

  const formatKST = (utcDate: string) => {
    const date = new Date(utcDate);
    // UTC → KST (+9시간)
    date.setHours(date.getHours() + 9);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  };

  // PDF 다운로드 버튼 클릭 시 실행되는 함수
  const downloadPDF = async (videoId: string, createdAt: string) => {
  try {
    setLoadingVideoId(videoId);
    const token = auth.token;
    if (!token) {
      console.warn("No token found for PDF download.");
      return;
    }
    const res = await axios.get('${API_BASE}/get-signed-url/', {
      params: { video_id: videoId },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log(videoId)
    const signedUrl = res.data.signed_url;
    console.log("📦 signed_url:", signedUrl);
    const date = new Date(createdAt);
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}:${String(
      date.getMinutes()
    ).padStart(2, '0')}`;

    const filename = `${formattedDate}_interview.pdf`;
    saveAs(signedUrl, filename);
  } catch (err) {
    console.error("다운로드 실패:", err);
  } finally {
    setLoadingVideoId(null);
  }
};

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
          {filteredData.length ? (
            filteredData.map((row, index) => (
              <tr key={index} className="border-t">
                <td className="py-2 px-4">{formatKST(row.created_at)}</td>
                <td className="py-2 px-4">
                  <Button
                    variant="outline"
                    onClick={() => downloadPDF(row.video_id, row.created_at)}
                    disabled={loadingVideoId === row.video_id}
                  >
                    {loadingVideoId === row.video_id ? (
                      <>
                        <Loader className="w-4 h-4 mr-1 animate-spin" /> 다운로드 중...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-1" /> PDF
                      </>
                    )}
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