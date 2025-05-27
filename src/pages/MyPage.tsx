import React, { useState, useRef } from 'react';
import { Button } from '../components/shared/Button';

export const MyPage: React.FC = () => {
  const [resume, setResume] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResume(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!resume) return;

    const formData = new FormData();
    formData.append('resume', resume);

    setIsUploading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/resume/upload/', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('이력서 업로드에 실패했습니다.');
      }

      alert('이력서가 성공적으로 업로드되었습니다.');
      setResume(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('이력서 업로드 실패:', error);
      alert('이력서 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/resume/delete/', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('이력서 삭제에 실패했습니다.');
      }

      alert('이력서가 성공적으로 삭제되었습니다.');
      setResume(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('이력서 삭제 실패:', error);
      alert('이력서 삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-normal text-gray-900">마이 페이지</h2>
          <p className="mt-2 text-sm text-gray-600">
            이력서를 업로드하고 AI 면접을 준비하세요
          </p>
        </div>

        <div className="mt-8 space-y-6 bg-white shadow-sm rounded-lg p-6 border border-gray-200">
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
              PDF, DOC, DOCX 파일 형식을 지원합니다
            </p>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">업로드된 이력서</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {resume ? resume.name : '업로드된 이력서가 없습니다'}
                </p>
              </div>
              {resume && (
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

        <div className="mt-8 space-y-6 bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <div>
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
                disabled={!resume}
              >
                AI 면접 시작하기
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 