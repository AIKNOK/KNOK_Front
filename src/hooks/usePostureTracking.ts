import { useEffect, useRef } from 'react';
import { Pose } from '@mediapipe/pose';
import { FaceMesh, NormalizedLandmark } from '@mediapipe/face_mesh';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

type PostureReason = 'shoulder' | 'headDown' | 'ear' | 'gaze';

interface PostureSegment {
  reason: PostureReason;
  start: number;
  end: number;
}

export function usePostureTracking(
  videoRef: React.RefObject<HTMLVideoElement>,
  videoId: string
) {
  // 누적 카운트 및 구간 ref
  const badPostureCountsRef = useRef<Record<PostureReason, number>>({
    shoulder: 0,
    headDown: 0,
    ear: 0,
    gaze: 0,
  });
  const badPostureSegmentsRef = useRef<PostureSegment[]>([]);

  // 자세 감지 내부 상태
  const startBadTimeRef = useRef<number | null>(null);
  const currentReasonRef = useRef<PostureReason | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // 미디어파이프 세팅
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    faceMesh.setOptions({
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    let latestFaceLandmarks: NormalizedLandmark[] | null = null;

    faceMesh.onResults((results) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        latestFaceLandmarks = results.multiFaceLandmarks[0];
      } else {
        latestFaceLandmarks = null;
      }
    });

    const videoStartTime = Date.now();
    const getVideoTime = () => (Date.now() - videoStartTime) / 1000;

    pose.onResults((results) => {
      const poseLandmarks = results.poseLandmarks;
      if (!poseLandmarks) return;

      const lShoulder = poseLandmarks[11];
      const rShoulder = poseLandmarks[12];
      const nose = poseLandmarks[0];
      const lEar = poseLandmarks[7];
      const rEar = poseLandmarks[8];

      const dx = lShoulder.x - rShoulder.x;
      const dy = lShoulder.y - rShoulder.y;
      const shoulderAngle = Math.atan2(dy, dx) * (180 / Math.PI);

      const avgShoulderY = (lShoulder.y + rShoulder.y) / 2;
      const headDown = nose.y > avgShoulderY + 0.1;

      const earAngle = Math.atan2(lEar.y - rEar.y, lEar.x - rEar.x) * (180 / Math.PI);

      let gazeOff = false;
      if (latestFaceLandmarks) {
        const leftIris = latestFaceLandmarks[468];
        const leftEyeLeft = latestFaceLandmarks[33];
        const leftEyeRight = latestFaceLandmarks[133];
        const eyeRange = leftEyeRight.x - leftEyeLeft.x;
        const irisPos = eyeRange > 0
          ? (leftIris.x - leftEyeLeft.x) / eyeRange
          : 0.5;
        if (irisPos < 0.35 || irisPos > 0.65) {
          gazeOff = true;
        }
      }

      let reason: PostureReason | null = null;
      if (Math.abs(shoulderAngle) > 10) reason = 'shoulder';
      else if (Math.abs(earAngle) > 10) reason = 'ear';
      else if (headDown) reason = 'headDown';
      else if (gazeOff) reason = 'gaze';

      // bad posture 감지 (3초 이상 유지 시만 기록)
      if (reason) {
        if (
          startBadTimeRef.current === null ||
          currentReasonRef.current !== reason
        ) {
          startBadTimeRef.current = Date.now();
          currentReasonRef.current = reason;
        } else if (Date.now() - (startBadTimeRef.current ?? 0) > 3000) {
          const end = getVideoTime();
          const start = end - 3;
          badPostureSegmentsRef.current.push({ reason, start, end });
          badPostureCountsRef.current[reason]++;
          // console.warn(`⚠️ 나쁜 자세 감지 (${reason}) count:`, badPostureCountsRef.current[reason]);
          startBadTimeRef.current = null;
          currentReasonRef.current = null;
        }
      } else {
        startBadTimeRef.current = null;
        currentReasonRef.current = null;
      }
    });

    // 영상 프레임 → 분석 → 랜드마크 전달 (3초마다)
    const analyze = async () => {
      const video = videoRef.current;
      if (!video) return;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      await faceMesh.send({ image: canvas });
      await pose.send({ image: canvas });
    };

    const intervalId = setInterval(analyze, 3000);

    return () => {
      clearInterval(intervalId);
      // 더 이상 unmount에서 POST하지 않음, 필요시 별도 호출
    };
  }, [videoRef, videoId]);

  /**
   * 면접 종료 시점에서 아래 함수 호출!
   */
  const sendPostureData = async () => {
    // 값 유효성 검사
    const counts = badPostureCountsRef.current;
    const segments = badPostureSegmentsRef.current;
    // 아무 데이터도 없으면 서버 호출 생략
    if (
      !segments || !Array.isArray(segments) || segments.length === 0 ||
      !counts || typeof counts !== 'object' || Object.values(counts).every((v) => v === 0)
    ) {
      // (원하면) console.log('자세 데이터 없음, POST 생략');
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/posture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          counts,
          segments,
        }),
      });
      if (!response.ok) {
        console.error('❌ posture 전송 시 서버 오류:', response.status);
      }
    } catch (e) {
      console.error('❌ posture 전송 실패:', e);
    }
  };

  return {
    countsRef: badPostureCountsRef,
    segmentsRef: badPostureSegmentsRef,
    sendPostureData, // 이 함수를 면접 종료 타이밍에서 직접 await sendPostureData() 해주세요!
  };
}
