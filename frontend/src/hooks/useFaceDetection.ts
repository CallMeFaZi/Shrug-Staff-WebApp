import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models'; // face-api models served from public/models/

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

  // Load models once
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    async function load() {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
        setLoading(false);
      } catch (err) {
        setError('Failed to load face detection models');
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

      return {
        descriptor: result.descriptor,
        detection: result.detection,
        landmarks: result.landmarks,
      };
    } catch {
      return null;
    }
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