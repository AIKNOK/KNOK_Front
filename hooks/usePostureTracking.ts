// src/hooks/usePostureTracking.ts
import { useEffect, useRef } from 'react';
import { Pose } from '@mediapipe/pose';
import { FaceMesh, NormalizedLandmark, NormalizedLandmarkList } from '@mediapipe/face_mesh';

export function usePostureTracking(videoRef: React.RefObject<HTMLVideoElement>) {
  const badPostureCountRef = useRef(0);
  let startBadTime: number | null = null;

  useEffect(() => {
    if (!videoRef.current) return;

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

    // 👇 얼굴 랜드마크를 저장할 변수 (정확한 타입 명시)
    let latestFaceLandmarks: NormalizedLandmark[] | null = null;

    // 얼굴 결과 받기
    faceMesh.onResults((results) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        latestFaceLandmarks = results.multiFaceLandmarks[0];
      } else {
        latestFaceLandmarks = null;
      }
    });

    // 자세 결과 받기
    pose.onResults((results) => {
      const poseLandmarks = results.poseLandmarks;
      if (!poseLandmarks) return;

      const lShoulder = poseLandmarks[11];
      const rShoulder = poseLandmarks[12];
      const nose = poseLandmarks[0];
      const lEar = poseLandmarks[7];
      const rEar = poseLandmarks[8];

      // 어깨 기울기
      const dx = lShoulder.x - rShoulder.x;
      const dy = lShoulder.y - rShoulder.y;
      const shoulderAngle = Math.atan2(dy, dx) * (180 / Math.PI);

      // 고개 숙임
      const avgShoulderY = (lShoulder.y + rShoulder.y) / 2;
      const headDown = nose.y > avgShoulderY + 0.1;

      // 귀 기울기
      const earAngle = Math.atan2(lEar.y - rEar.y, lEar.x - rEar.x) * (180 / Math.PI);

      // 시선 흐트러짐 판단
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

      const isBad =
        Math.abs(shoulderAngle) > 10 ||
        Math.abs(earAngle) > 10 ||
        headDown ||
        gazeOff;

      if (isBad) {
        if (!startBadTime) {
          startBadTime = Date.now();
        } else if (Date.now() - startBadTime > 3000) {
          badPostureCountRef.current++;
          console.warn('⚠️ 자세 나쁨 count 증가 →', badPostureCountRef.current);
          startBadTime = null;
        }
      } else {
        startBadTime = null;
      }
    });

    // 3초마다 분석
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
    };
  }, [videoRef]);

  return badPostureCountRef;
}