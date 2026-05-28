import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) navigate('/admin/dashboard');
  }, [isAuthenticated, navigate]);

  const handleKeyPress = (key: string) => {
    if (key === 'clear') { setPin(''); setError(''); }
    else if (key === 'backspace') { setPin(prev => prev.slice(0, -1)); }
    else if (pin.length < 6) { setPin(prev => prev + key); setError(''); }
  };

  const handleSubmit = async () => {
    if (pin.length !== 6) { setError('Enter 6-digit PIN'); return; }
    setLoading(true);
    setError('');
    try {
      const { adminApi } = await import('../../api/client');
      const res = await adminApi.verifyPin(pin);
      if (res.success && res.token) {
        setToken(res.token);
        toast.success('Welcome!');
        navigate(searchParams.get('redirect') || '/admin/dashboard');
      } else {
        setError(res.message || 'Invalid PIN');
        setPin('');
      }
    } catch {
      setError('Connection error');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
      {/* Back button */}
      <div className="w-full max-w-sm mb-4">
        <button onClick={() => navigate('/')} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </button>
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Login</h1>
          <p className="text-sm text-gray-400 mt-1">Enter your 6-digit PIN</p>
        </div>

        <div className="bg-[#1e293b] rounded-2xl p-6 border border-gray-700/50">
          {/* PIN dots */}
          <div className="flex justify-center gap-3 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`w-10 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-all ${
                i < pin.length ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-600'
              }`}>
                {i < pin.length ? '●' : ''}
              </div>
            ))}
          </div>

          {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

          <div className="pin-keypad mb-6">
            {['1','2','3','4','5','6','7','8','9'].map(n => (
              <button key={n} onClick={() => handleKeyPress(n)} className="mx-auto">{n}</button>
            ))}
            <button onClick={() => handleKeyPress('clear')} className="mx-auto !text-xs !text-red-400">Clear</button>
            <button onClick={() => handleKeyPress('0')} className="mx-auto">0</button>
            <button onClick={() => handleKeyPress('backspace')} className="mx-auto !text-xs">⌫</button>
          </div>

          <button onClick={handleSubmit} disabled={pin.length !== 6 || loading} className="btn-primary w-full">
            {loading ? 'Verifying...' : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  );
}