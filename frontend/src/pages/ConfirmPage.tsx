import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import type { Employee } from '../types';

interface LocationState {
  employee: Employee;
  confidence: number;
}

export default function ConfirmPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const [loading, setLoading] = useState(false);

  const employee = state?.employee;

  if (!employee) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No employee data found</p>
          <button onClick={() => navigate('/attendance')} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const { attendanceApi } = await import('../api/client');
      await attendanceApi.clockIn(employee.id);
      navigate('/success', {
        state: { employee, action: 'in', confidence: state?.confidence },
      });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to clock in');
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      const { attendanceApi } = await import('../api/client');
      await attendanceApi.clockOut(employee.id);
      navigate('/success', {
        state: { employee, action: 'out', confidence: state?.confidence },
      });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to clock out');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      <div className="w-full max-w-sm">
        {/* Avatar */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <span className="text-3xl font-bold text-white">
              {employee.full_name.charAt(0)}
            </span>
          </div>

          {state?.confidence && (
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-medium border border-green-500/20">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {Math.round(state.confidence * 100)}% Match
              </span>
            </div>
          )}

          <h2 className="text-2xl font-bold text-white mb-1">{employee.full_name}</h2>
          <p className="text-sm text-gray-400">ID: {employee.employee_code}</p>
        </div>

        {/* Info card */}
        <div className="bg-[#1e293b]/80 backdrop-blur rounded-2xl p-5 border border-gray-700/50 mb-6">
          <p className="text-sm text-gray-300 text-center">
            Is this you? Choose an option below.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleClockIn}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-2xl font-semibold text-base shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? '⏳ Processing...' : '✅ Clock In'}
          </button>

          <button
            onClick={handleClockOut}
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4 rounded-2xl font-semibold text-base shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? '⏳ Processing...' : '🚪 Clock Out'}
          </button>

          <button
            onClick={() => navigate('/attendance')}
            className="w-full bg-white/5 text-gray-300 px-6 py-3 rounded-2xl font-medium border border-gray-700/50 hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
          >
            ← Not me, try again
          </button>
        </div>
      </div>
    </div>
  );
}