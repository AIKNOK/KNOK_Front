import { useEffect, useRef } from 'react';
import { Pose } from '@mediapipe/pose';
import { FaceMesh, NormalizedLandmark } from '@mediapipe/face_mesh';

type PostureReason = 'shoulder' | 'headDown' | 'ear' | 'gaze';

export function usePostureTracking(
  videoRef: React.RefObject<HTMLVideoElement>,
  videoId: string  
) {
  const badPostureCountsRef = useRef<Record<PostureReason, number>>({
    shoulder: 0,
    headDown: 0,
    ear: 0,
    gaze: 0,
  });

  const badPostureSegmentsRef = useRef<{ reason: PostureReason; start: number; end: number }[]>([]);
  let startBadTime: number | null = null;
  let currentReason: PostureReason | null = null;

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

      if (reason) {
        if (!startBadTime || currentReason !== reason) {
          startBadTime = Date.now();
          currentReason = reason;
        } else if (Date.now() - startBadTime > 3000) {
          const end = getVideoTime();
          const start = end - 3;

          badPostureSegmentsRef.current.push({ reason, start, end });
          badPostureCountsRef.current[reason]++;
          console.warn(`⚠️ 나쁜 자세 감지 (${reason}) → count:`, badPostureCountsRef.current[reason]);

          startBadTime = null;
          currentReason = null;
        }
      } else {
        startBadTime = null;
        currentReason = null;
      }
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

      const segments = badPostureSegmentsRef.current;
      fetch('/posture/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments,
          counts: badPostureCountsRef.current,
          videoId: videoId, 
        }),
      });
    };
  }, [videoRef, videoId]);

  return {
    countsRef: badPostureCountsRef,
    segmentsRef: badPostureSegmentsRef,
  };
}
