import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function SplashPage() {
  const navigate = useNavigate();
  const [showPinModal, setShowPinModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      {/* Admin button - top right, compact */}
      <div className="flex justify-end p-4">
        <button
          onClick={() => setShowPinModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur border border-white/10 rounded-full text-xs font-medium text-white/70 hover:bg-white/20 hover:text-white transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Admin
        </button>
      </div>

      {/* Main content - centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        {/* Logo area */}
        <div className="mb-10 text-center">
          <img src="/logo.png" alt="SHRUG STAFF" className="w-20 h-20 rounded-2xl mx-auto mb-5 shadow-lg shadow-blue-500/20 object-cover" />
          <h1 className="text-3xl font-bold text-white mb-1">SHRUG STAFF</h1>
          <p className="text-sm text-gray-400">AI Face Recognition Attendance</p>
        </div>

        {/* Main action button */}
        <button
          onClick={() => navigate('/attendance')}
          className="w-full max-w-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700 transition-all active:scale-[0.98]"
        >
          <span className="flex items-center justify-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Mark Attendance
          </span>
        </button>

        {/* Footer */}
        <p className="mt-12 text-xs text-gray-600">v1.0.0 • Made By Faizan • Team Shrug</p>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <PinModal
          onSuccess={() => {
            setShowPinModal(false);
            navigate('/admin/dashboard');
          }}
          onClose={() => setShowPinModal(false)}
        />
      )}
    </div>
  );
}

function PinModal({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleKeyPress = (key: string) => {
    if (key === 'clear') {
      setPin('');
      setError('');
    } else if (key === 'backspace') {
      setPin(prev => prev.slice(0, -1));
      setError('');
    } else if (pin.length < 6) {
      setPin(prev => prev + key);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (pin.length !== 6) {
      setError('Please enter a 6-digit PIN');
      return;
    }
    setLoading(true);
    try {
      const { adminApi } = await import('../api/client');
      const res = await adminApi.verifyPin(pin);
      if (res.success && res.token) {
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().setToken(res.token);
        onSuccess();
      } else {
        setError(res.message || 'Invalid PIN');
        setPin('');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Network error');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1e293b] rounded-2xl p-8 shadow-2xl max-w-sm w-full border border-gray-700/50" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-2">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Admin Access</h2>
          <p className="text-sm text-gray-400">Enter PIN to continue</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 my-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-10 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-all ${
                i < pin.length
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-gray-600 text-gray-500'
              }`}
            >
              {i < pin.length ? '●' : ''}
            </div>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

        {/* Keypad */}
        <div className="pin-keypad mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button key={num} onClick={() => handleKeyPress(num)} className="mx-auto">{num}</button>
          ))}
          <button onClick={() => handleKeyPress('clear')} className="mx-auto !text-xs !text-red-400">Clear</button>
          <button onClick={() => handleKeyPress('0')} className="mx-auto">0</button>
          <button onClick={() => handleKeyPress('backspace')} className="mx-auto !text-xs">⌫</button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={pin.length !== 6 || loading}
          className="btn-primary w-full text-sm"
        >
          {loading ? 'Verifying...' : 'Unlock'}
        </button>
      </div>
    </div>
  );
}