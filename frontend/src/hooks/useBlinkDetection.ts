// Blink Detection Hook
// Uses face-api.js landmarks to detect blinks via EAR (Eye Aspect Ratio)

import { useRef, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';

// Eye landmark indices from face-api.js (68-point model)
const LEFT_EYE = [36, 37, 38, 39, 40, 41];
const RIGHT_EYE = [42, 43, 44, 45, 46, 47];

function euclideanDist(a: faceapi.Point, b: faceapi.Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function calculateEAR(landmarks: faceapi.FaceLandmarks68, eyeIndices: number[]): number {
  const pts = eyeIndices.map((i) => landmarks.positions[i]);
  const a = euclideanDist(pts[1], pts[5]); // vertical 1
  const b = euclideanDist(pts[2], pts[4]); // vertical 2
  const c = euclideanDist(pts[0], pts[3]); // horizontal
  if (c === 0) return 1;
  return (a + b) / (2.0 * c);
}

export function useBlinkDetection() {
  const earThreshold = 0.22; // Below this = eye closed
  const blinkFramesRequired = 2; // Need 2 consecutive frames with eyes closed
  const closedCounterRef = useRef(0);
  const blinkDetectedRef = useRef(false);

  const checkBlink = useCallback((landmarks: faceapi.FaceLandmarks68): boolean => {
    if (blinkDetectedRef.current) return true; // Already blinked

    const leftEAR = calculateEAR(landmarks, LEFT_EYE);
    const rightEAR = calculateEAR(landmarks, RIGHT_EYE);
    const avgEAR = (leftEAR + rightEAR) / 2;

    if (avgEAR < earThreshold) {
      closedCounterRef.current++;
      if (closedCounterRef.current >= blinkFramesRequired) {
        blinkDetectedRef.current = true;
        return true;
      }
    } else {
      closedCounterRef.current = 0;
    }

    return false;
  }, []);

  const resetBlink = useCallback(() => {
    blinkDetectedRef.current = false;
    closedCounterRef.current = 0;
  }, []);

  return { checkBlink, resetBlink };
}