import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';

// Load models from CDN instead of local static files
// Models from: https://github.com/vladmandic/face-api/tree/master/model
const MODEL_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model';

interface FaceResult {
  descriptor: Float32Array;
  detection: faceapi.FaceDetection;
  landmarks: faceapi.FaceLandmarks68;
}

export function useFaceDetection() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    // Load models with a timeout (30 s). If it takes longer we show an error instead of hanging forever.
    async function load() {
      const timeoutMs = 30000;
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Model load timeout (30 s)')), timeoutMs)
      );
      try {
        await Promise.race([
          Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          ]),
          timeout,
        ]);
        setModelsLoaded(true);
        setLoading(false);
      } catch (err) {
        console.error('FaceAPI model load error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load face detection models');
        setLoading(false);
      }
    }
    load();
  }, []);

  const detectFace = useCallback(async (
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
    } catch { return null; }
  }, [modelsLoaded]);

  const extractDescriptor = useCallback(async (
    input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
  ): Promise<number[] | null> => {
    const result = await detectFace(input);
    if (!result) return null;
    return Array.from(result.descriptor);
  }, [detectFace]);

  return { modelsLoaded, loading, error, detectFace, extractDescriptor };
}