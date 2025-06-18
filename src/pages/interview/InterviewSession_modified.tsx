// 꼬리 질문 API 호출 함수 수정
const decideFollowup = async (
  userAnswer: string,
  questionIndex: number
): Promise<boolean> => {
  const token =
    localStorage.getItem("id_token") || localStorage.getItem("access_token");
  if (!token || !resumeRef.current) {
    console.error("❌ 토큰 또는 이력서 텍스트가 없습니다.");
    return false;
  }

  const payload = {
    resume_text: resumeRef.current,
    user_answer: userAnswer.trim(),
    base_question_number: parseInt(questions[questionIndex].id, 10),
    interview_id: videoId,
    existing_question_numbers: questions.map((q) => q.id),
  };

  console.log("▶ 꼬리질문 API 호출 직전 payload:", payload);
  console.log(`▶ API 호출 URL: ${API_BASE}/followup/check/`);
  console.log(`▶ 토큰: ${token.substring(0, 10)}...`);

  try {
    const res = await fetch(`${API_BASE}/followup/check/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    
    console.log(`▶ followup/check 상태코드: ${res.status}`);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("▶ follow-up check failed:", res.status, errorText);
      return false;
    }
    
    const data = await res.json();
    console.log("▶ 꼬리질문 API 응답:", data);
    
    if (data.followup && data.question) {
      const baseId = questions[questionIndex].id.split("-")[0];
      const suffixCnt = questions.filter((q) =>
        q.id.startsWith(baseId + "-")
      ).length;
      const newId = `${baseId}-${suffixCnt + 1}`;
      
      // 꼬리 질문에 대한 오디오 URL 설정
      // 백엔드에서 TTS 생성 후 반환된 audio_url 사용
      const audioUrl = data.audio_url || `${S3_BASE_URL}${userEmail.split('@')[0]}/${newId}.wav`;
      console.log("▶ 새 질문 ID:", newId);
      console.log("▶ 오디오 URL:", audioUrl);
      
      setQuestions((prev) => [
        ...prev.slice(0, questionIndex + 1),
        {
          id: newId,
          text: data.question,
          type: "behavioral",
          difficulty: "medium",
          audio_url: audioUrl,
        },
        ...prev.slice(questionIndex + 1),
      ]);
      return true;
    }
    return false;
  } catch (error) {
    console.error("▶ 꼬리질문 API 호출 중 오류:", error);
    return false;
  }
};

// stopRecording 함수 내 꼬리질문 호출 부분 수정
if (transcript.trim().length > 0) {
  try {
    console.log("▶ 꼬리질문 결정 시작");
    const result = await decideFollowup(transcript, qIdx);
    console.log("▶ 꼬리질문 결정 결과:", result);
  } catch (err) {
    console.error("❌ 꼬리 질문 결정 실패:", err);
    alert("꼬리 질문 결정 중 오류가 발생했습니다.");
  }
}
