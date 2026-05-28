import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AttendancePage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      setStream(mediaStream);
      setIsCameraOn(true);
    } catch {
      toast.error('Camera access denied. Please allow camera permissions.');
    }
  }, []);

  useEffect(() => {
    if (isCameraOn && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraOn, stream]);

  const captureAndRecognize = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessing(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no ctx');
      ctx.drawImage(video, 0, 0);
      const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.9));
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });
      const { recognitionApi } = await import('../api/client');
      const result = await recognitionApi.recognize(file);
      if (result.matched && result.employee) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        navigate(`/confirm/${result.employee.id}`, { state: { employee: result.employee, confidence: result.confidence } });
      } else {
        toast.error(result.message || 'Face not recognized');
        setIsProcessing(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Recognition failed');
      setIsProcessing(false);
    }
  }, [navigate, stream]);

  const stopCamera = useCallback(() => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
    setIsCameraOn(false);
  }, [stream]);

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
      <canvas ref={canvasRef} className="hidden" />

      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-white mb-1">Face Recognition</h1>
        <p className="text-sm text-gray-400">Look at the camera to mark your attendance</p>
      </div>

      <div className="camera-container bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50" style={{ maxWidth: '400px', position: 'relative' }}>
        {isCameraOn ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block' }} />
            {/* Face overlay circle on top of video */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: '160px', height: '160px', border: '2px dashed rgba(96,165,250,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'rgba(96,165,250,0.6)', fontSize: '12px', textAlign: 'center' }}>Position<br/>face here</span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' }}>
            <div className="text-center text-gray-500">
              <svg style={{ width: '48px', height: '48px', margin: '0 auto 12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <p className="text-sm">Camera off</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        {!isCameraOn ? (
          <button onClick={startCamera} className="btn-primary px-8 py-3 text-base">
            📷 Start Camera
          </button>
        ) : (
          <>
            <button onClick={captureAndRecognize} disabled={isProcessing} className="btn-primary px-6 py-3 text-base">
              {isProcessing ? '⏳ Processing...' : '📸 Capture'}
            </button>
            <button onClick={stopCamera} className="btn-secondary px-5 py-3">Stop</button>
          </>
        )}
      </div>

      <button onClick={() => navigate('/')} className="mt-6 text-xs text-gray-500 hover:text-gray-300 transition-colors">
        ← Back
      </button>
    </div>
  );
}