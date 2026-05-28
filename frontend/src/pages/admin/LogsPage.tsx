import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { logsApi } from '../../api/client';
import type { SystemLog } from '../../types';

export default function LogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');

  // Re-fetch when filter changes (FIXES the broken filter buttons)
  useEffect(() => { loadLogs(); }, [moduleFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await logsApi.system({ module: moduleFilter || undefined });
      setLogs(Array.isArray(res) ? res : []);
    } catch { toast.error('Failed to load logs'); }
    finally { setLoading(false); }
  };

  const modules = ['', 'recognition', 'admin_auth', 'employees', 'payroll', 'settings'];

  if (loading && logs.length === 0) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;

  return (
    <div className="page-enter">
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-5">System Logs</h1>

      <div className="flex gap-2 mb-5 flex-wrap">
        {modules.map(m => (
          <button key={m} onClick={() => setModuleFilter(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${moduleFilter===m ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
            {m || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead><tr><th className="table-header">Time</th><th className="table-header">Module</th><th className="table-header">Action</th><th className="table-header">Details</th></tr></thead>
            <tbody className="divide-y divide-gray-700/50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-white/[0.02]">
                  <td className="table-cell text-xs text-gray-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="table-cell"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">{log.module}</span></td>
                  <td className="table-cell text-xs text-gray-300 font-mono">{log.action}</td>
                  <td className="table-cell text-xs text-gray-500 max-w-xs truncate">{log.details || '-'}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-gray-500 text-sm">No logs</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}