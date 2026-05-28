import { useLocation, useNavigate } from 'react-router-dom';

interface LocationState {
  employee: { full_name: string; employee_code: string };
  action: 'in' | 'out';
  confidence?: number;
}

export default function SuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  if (!state) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No data available</p>
          <button onClick={() => navigate('/')} className="btn-primary">Go Home</button>
        </div>
      </div>
    );
  }

  const { employee, action } = state;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6" style={{ background: `linear-gradient(135deg, ${action === 'in' ? '#064e3b 0%, #0f172a 100%' : '#7c2d12 0%, #0f172a 100%'})` }}>
      <div className="w-full max-w-sm text-center">
        {/* Success icon */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
          action === 'in' ? 'bg-green-500/20' : 'bg-orange-500/20'
        }`}>
          {action === 'in' ? (
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          )}
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {action === 'in' ? 'Clocked In!' : 'Clocked Out!'}
        </h2>
        <p className="text-gray-400 text-sm mb-8">{dateStr} · {timeStr}</p>

        {/* Details card */}
        <div className="bg-[#1e293b]/80 backdrop-blur rounded-2xl p-5 border border-gray-700/50 mb-8 text-left">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Employee</span>
              <span className="text-white font-medium text-sm">{employee.full_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">ID</span>
              <span className="text-gray-300 text-sm">{employee.employee_code}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Action</span>
              <span className={`text-sm font-medium ${action === 'in' ? 'text-green-400' : 'text-orange-400'}`}>
                {action === 'in' ? 'Clock In' : 'Clock Out'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/attendance')}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-2xl font-semibold shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all active:scale-[0.98]"
          >
            Mark Another
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-white/5 text-gray-300 px-6 py-3 rounded-2xl font-medium border border-gray-700/50 hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}