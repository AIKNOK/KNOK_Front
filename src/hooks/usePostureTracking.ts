import { useEffect, useRef } from 'react';
import { Pose } from '@mediapipe/pose';
import { FaceMesh, NormalizedLandmark } from '@mediapipe/face_mesh';

export function usePostureTracking(videoRef: React.RefObject<HTMLVideoElement>) {
  const shoulderTiltCountRef = useRef(0);
  const headDownCountRef = useRef(0);
  const earTiltCountRef = useRef(0);
  const gazeOffCountRef = useRef(0);

  const badStartTimesRef = useRef({
    shoulder: null as number | null,
    head: null as number | null,
    ear: null as number | null,
    gaze: null as number | null,
  });

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

    let latestFaceLandmarks: NormalizedLandmark[] | null = null;

    faceMesh.onResults((results) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        latestFaceLandmarks = results.multiFaceLandmarks[0];
      } else {
        latestFaceLandmarks = null;
      }
    });

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
      const shoulderBad = Math.abs(shoulderAngle) > 10;

      const avgShoulderY = (lShoulder.y + rShoulder.y) / 2;
      const headDown = nose.y > avgShoulderY + 0.1;

      const earAngle = Math.atan2(lEar.y - rEar.y, lEar.x - rEar.x) * (180 / Math.PI);
      const earTilt = Math.abs(earAngle) > 10;

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

      const now = Date.now();

      const checkBadPosture = (
        type: keyof typeof badStartTimesRef.current,
        isBad: boolean,
        countRef: React.MutableRefObject<number>
      ) => {
        if (isBad) {
          if (!badStartTimesRef.current[type]) {
            badStartTimesRef.current[type] = now;
          } else if (now - (badStartTimesRef.current[type] ?? 0) > 3000) {
            countRef.current++;
            console.warn(`⚠️ ${type} 나쁨 count 증가 →`, countRef.current);
            badStartTimesRef.current[type] = null;
          }
        } else {
          badStartTimesRef.current[type] = null;
        }
      };

      checkBadPosture('shoulder', shoulderBad, shoulderTiltCountRef);
      checkBadPosture('head', headDown, headDownCountRef);
      checkBadPosture('ear', earTilt, earTiltCountRef);
      checkBadPosture('gaze', gazeOff, gazeOffCountRef);
    });

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

  return {
    shoulderTiltCountRef, // 어깨 기울기
    headDownCountRef,  // 고개 숙임
    earTiltCountRef,  // 귀 기울기
    gazeOffCountRef,  //  시선
  };
}
