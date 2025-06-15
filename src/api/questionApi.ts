// src/api/questionApi.ts

/**
 * S3 버킷에서 사용자별 저장된 질문을 가져오는 API
 */
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * S3 버킷 'resume-questions'에서 사용자별 저장된 질문을 가져옵니다.
 * 
 * @param difficulty 질문 난이도 (쉬움, 중간, 어려움)
 * @returns 질문 목록
 */
export const getResumeQuestions = async (difficulty: string = '중간') => {
  const token = localStorage.getItem('id_token') || localStorage.getItem('access_token');
  if (!token) {
    throw new Error('인증 토큰이 없습니다.');
  }

  try {
    const response = await axios.get(
      `${API_BASE}/get-resume-questions/`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          difficulty
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('질문 가져오기 API 호출 오류:', error);
    throw error;
  }
};
