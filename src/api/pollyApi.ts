// src/api/pollyApi.ts

/**
 * Amazon Polly API를 호출하는 백엔드 API 구현
 */
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * 텍스트를 음성으로 변환하는 API 호출
 * 
 * @param text 음성으로 변환할 텍스트
 * @param voiceId 사용할 음성 ID (기본값: 'Seoyeon' - 한국어 여성 음성)
 * @returns 오디오 URL을 포함한 응답
 */
export const synthesizeSpeech = async (
  text: string,
  voiceId: string = 'Seoyeon'
) => {
  const token = localStorage.getItem('id_token') || localStorage.getItem('access_token');
  if (!token) {
    throw new Error('인증 토큰이 없습니다.');
  }

  try {
    const response = await axios.post(
      `${API_BASE}/polly/synthesize/`,
      {
        text,
        voice_id: voiceId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Polly API 호출 오류:', error);
    throw error;
  }
};
