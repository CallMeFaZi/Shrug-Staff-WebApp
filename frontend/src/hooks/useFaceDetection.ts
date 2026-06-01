import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';

/**
 * URL of the FaceAPI models.
 * Using jsDelivr CDN (fast) instead of raw GitHub (slow).
 */
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

interface FaceResult {
  descriptor: Float32Array;
  detection: faceapi.FaceDetection;
  landmarks: faceapi.FaceLandmarks68;
}

/**
 * Custom hook for face detection.
 * - Loads FaceAPI models with a 30‑second timeout.
 * - Returns loading state, error, and functions to detect/extract descriptors.
 */
export function useFaceDetection() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    // ---------- 30‑second timeout ----------
    const timeoutMs = 30000; // 30 seconds
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Model load timeout (30 s)')), timeoutMs)
    );

    async function load() {
      try {
        // Load all three models in parallel, but abort if timeout occurs
        await Promise.race([
          Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          ]),
          timeoutPromise,
        ]);
        setModelsLoaded(true);
        setLoading(false);
      } catch (err) {
        console.error('FaceAPI model load error:', err);
        if (err instanceof Error && err.message.includes('Model load timeout')) {
          setError(err.message);
        } else {
          setError('Failed to load face detection models');
        }
        setLoading(false); // always stop the loading spinner
      }
    }
    load();
  }, []);

  // ---------- Face detection ----------
  const detectFace = useCallback(
    async (
      input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
    ): Promise<FaceResult | null> => {
      if (!modelsLoaded) return null;
      try {
        const result = await faceapi
          .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (!result) return null;
        return { descriptor: result.descriptor, detection: result.detection, landmarks: result.landmarks };
      } catch {
        return null;
      }
    },
    [modelsLoaded]
  );

  // ---------- Extract descriptor ----------
  const extractDescriptor = useCallback(
    async (input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement): Promise<number[] | null> => {
      const result = await detectFace(input);
      if (!result) return null;
      return Array.from(result.descriptor);
    },
    [detectFace]
  );

  return { modelsLoaded, loading, error, detectFace, extractDescriptor };
}