// src/pages/interview/UploadResume.tsx

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/shared/Button";
import Layout from "../../components/layout";

export const UploadResume: React.FC = () => {
  const navigate = useNavigate();
  const [resume, setResume] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedResumeUrl, setUploadedResumeUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 토큰 가져오기
  const getToken = () =>
    localStorage.getItem("id_token") || localStorage.getItem("access_token");

  // 최초 렌더 시 업로드된 이력서 정보 가져오기
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    (async () => {
      try {
        const response = await fetch("/api/resume/", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.file_url) setUploadedResumeUrl(data.file_url);
        }
      } catch (error) {
        console.error("이력서 조회 실패:", error);
      }
    })();
  }, []);

  // 파일 선택 시
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setResume(e.target.files[0]);
    }
  };

  // 업로드 버튼 클릭 시
  const handleUpload = async () => {
    if (!resume) return;
    const token = getToken();
    if (!token) return alert("로그인이 필요합니다.");

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("resume", resume);

      const response = await fetch("/api/resume/upload/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error("이력서 업로드 실패");

      const data = await response.json();
      setUploadedResumeUrl(data.file_url || null);
      alert("이력서가 성공적으로 업로드되었습니다.");
      setResume(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("이력서 업로드 실패:", error);
      alert("이력서 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  // 삭제 버튼 클릭 시
  const handleDelete = async () => {
    const token = getToken();
    if (!token) return alert("로그인이 필요합니다.");

    try {
      const response = await fetch("/api/resume/delete/", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("이력서 삭제 실패");

      alert("이력서가 성공적으로 삭제되었습니다.");
      setResume(null);
      setUploadedResumeUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("이력서 삭제 실패:", error);
      alert("이력서 삭제 중 오류가 발생했습니다.");
    }
  };

  // AI 면접 시작하기 버튼 클릭 시 다음 단계로 이동
  const handleStartInterview = () => {
    if (uploadedResumeUrl) {
      navigate("/interview/check-environment");
    }
  };

  return (
    <Layout>
      {/* 
        min-h-screen: 화면 높이만큼 최소 높이 확보 
        bg-white: 배경색 흰색 
        px-4: 좌우 1rem 여백 
        sm:px-6, lg:px-8: 반응형 여백 
        **py-12 제거 → 상단 여백 없앰**
      */}
      <main className="min-h-screen bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* 페이지 제목 부분 */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-normal text-gray-900">
              AI 면접&nbsp;
              <span className="text-[#8447e9] font-semibold">KNOK</span>
              &nbsp;서비스 시작하기
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              이력서를 업로드하고 AI 면접을 준비하세요
            </p>
          </div>

          {/* 이력서 업로드 섹션 */}
          <div className="space-y-6 bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                이력서 업로드
              </label>
              <div className="mt-1 flex items-center space-x-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-primary file:text-white
                    hover:file:cursor-pointer hover:file:bg-primary/90
                    hover:file:text-white"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleUpload}
                  isLoading={isUploading}
                  disabled={!resume || isUploading}
                >
                  업로드
                </Button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                PDF, DOC, DOCX 형식을 지원합니다
              </p>
            </div>

            {/* 업로드된 이력서 보여주는 부분 */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    업로드된 이력서
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {uploadedResumeUrl ? (
                      <>
                        <a
                          href={uploadedResumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          보기
                        </a>
                        <span className="ml-2 text-gray-400">
                          ({uploadedResumeUrl.split("/").pop()})
                        </span>
                      </>
                    ) : (
                      "업로드된 이력서가 없습니다"
                    )}
                  </p>
                </div>
                {(resume || uploadedResumeUrl) && (
                  <Button
                    type="button"
                    variant="danger"
                    size="md"
                    onClick={handleDelete}
                  >
                    삭제
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* AI 면접 준비 섹션 */}
          <div className="mt-8 bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">AI 면접 준비</h3>
            <p className="mt-2 text-sm text-gray-600">
              이력서를 업로드하면 AI가 분석하여 맞춤형 면접 질문을 생성합니다
            </p>
            <div className="mt-4">
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleStartInterview}
                disabled={!uploadedResumeUrl}
              >
                AI 면접 시작하기
              </Button>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default UploadResume;
