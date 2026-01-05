import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Calendar, 
  AlertCircle,
  Loader,
  Eye,
  X
} from 'lucide-react';

const InterviewHistory = ({ username }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    byType: {
      company: 0,
      self: 0,
      weakness: 0,
      resume: 0
    }
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010';

  // 获取面试历史记录
  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/interview/history/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('获取历史记录失败');
      }

      const data = await response.json();
      
      if (data.code === 200 && Array.isArray(data.data)) {
        setRecords(data.data);
        
        // 计算统计信息
        const newStats = {
          total: data.data.length,
          byType: {
            company: data.data.filter(r => r.interview_type === 'company').length,
            self: data.data.filter(r => r.interview_type === 'self').length,
            weakness: data.data.filter(r => r.interview_type === 'weakness').length,
            resume: data.data.filter(r => r.interview_type === 'resume').length
          }
        };
        setStats(newStats);
      } else {
        throw new Error(data.message || '返回格式错误');
      }
    } catch (err) {
      console.error('获取历史记录失败:', err);
      setError(err.message || '获取历史记录失败，请稍后重试');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }; // 结束 fetchHistory 函数（补上的闭合括号）

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // 删除记录
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/interview/history/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      setRecords(records.filter(r => r.id !== id));
      setDeleteConfirm(null);
      
      // 重新计算统计
      const deleted = records.find(r => r.id === id);
      setStats(prev => ({
        total: prev.total - 1,
        byType: {
          ...prev.byType,
          [deleted.interview_type]: prev.byType[deleted.interview_type] - 1
        }
      }));
    } catch (err) {
      console.error('删除失败:', err);
      setError('删除失败，请稍后重试');
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    try {
      let normalized = dateString;
      // 后端有些时间是 UTC 但没有时区（例如 2026-01-05T12:34:56）
      // 这里按 UTC 处理，避免显示成北京时间少 8 小时。
      if (
        typeof normalized === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(normalized)
      ) {
        normalized = `${normalized}Z`;
      }

      const date = new Date(normalized);
      return date.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // 获取面试类型标签
  const getTypeLabel = (type) => {
    const types = {
      'company': { label: '公司题库', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      'self': { label: '自选知识点', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
      'weakness': { label: '薄弱点强化', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
      'resume': { label: '简历定制', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' }
    };
    return types[type] || { label: type, color: 'bg-slate-100 text-slate-800' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">加载历史记录中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-300">加载失败</h3>
            <p className="text-red-700 dark:text-red-400 mt-1">{error}</p>
            <button
              onClick={fetchHistory}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 border border-blue-100 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">总面试次数</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.total}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-200 dark:text-blue-800" />
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 p-6 border border-blue-200 dark:border-blue-800">
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">公司题库</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.byType.company}</p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 p-6 border border-green-200 dark:border-green-800">
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">自选知识点</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.byType.self}</p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30 p-6 border border-orange-200 dark:border-orange-800">
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">薄弱点强化</p>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{stats.byType.weakness}</p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 p-6 border border-purple-200 dark:border-purple-800">
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">简历定制</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{stats.byType.resume}</p>
        </div>
      </div>

      {/* 历史记录列表 */}
      {records.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">还没有面试记录</p>
          <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">完成一次面试后，记录将出现在这里</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const isExpanded = expandedId === record.id;
            const typeInfo = getTypeLabel(record.interview_type);
            
            return (
              <div
                key={record.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md dark:hover:shadow-xl dark:hover:shadow-blue-900/10 transition-all duration-200 overflow-hidden"
              >
                <div
                  className="p-5 cursor-pointer flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : record.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(record.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      {record.company && (
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {record.company}
                        </p>
                      )}
                      {record.position && (
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {record.position}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailModal(record);
                      }}
                      className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="查看详情"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(record.id);
                      }}
                      className="p-2 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="删除"
                    >
                      <Trash2 size={18} />
                    </button>
                    {isExpanded ? (
                      <ChevronUp size={20} className="text-blue-600 dark:text-blue-400" />
                    ) : (
                      <ChevronDown size={20} className="text-slate-400" />
                    )}
                  </div>
                </div>

                {/* 展开的详情 */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-5">
                    {record.summary && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                          面试总结
                        </p>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar">
                          {record.summary}
                        </div>
                      </div>
                    )}
                    
                    {record.questions && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                          问题列表
                        </p>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                          {typeof record.questions === 'string' ? (
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                              {record.questions}
                            </p>
                          ) : Array.isArray(record.questions) ? (
                            <ul className="space-y-2">
                              {record.questions.map((q, i) => (
                                <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start">
                                  <span className="text-blue-600 dark:text-blue-400 mr-2 font-semibold">{i + 1}.</span>
                                  <span>{typeof q === 'string' ? q : JSON.stringify(q)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              {JSON.stringify(record.questions, null, 2)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 删除确认对话框 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">删除记录</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              确定要删除这条面试记录吗？此操作无法撤销。
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 详情模态框 */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-96 overflow-y-auto custom-scrollbar">
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">面试详情</h3>
              <button
                onClick={() => setDetailModal(null)}
                className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {detailModal.company && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    公司
                  </p>
                  <p className="text-slate-900 dark:text-white">{detailModal.company}</p>
                </div>
              )}
              {detailModal.position && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    职位
                  </p>
                  <p className="text-slate-900 dark:text-white">{detailModal.position}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  面试类型
                </p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getTypeLabel(detailModal.interview_type).color}`}>
                  {getTypeLabel(detailModal.interview_type).label}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  时间
                </p>
                <p className="text-slate-900 dark:text-white">{formatDate(detailModal.created_at)}</p>
              </div>
              {detailModal.summary && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    面试总结
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {detailModal.summary}
                  </div>
                </div>
              )}
              {detailModal.questions && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    问题列表
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                    {typeof detailModal.questions === 'string' ? (
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {detailModal.questions}
                      </p>
                    ) : Array.isArray(detailModal.questions) ? (
                      <ul className="space-y-2">
                        {detailModal.questions.map((q, i) => (
                          <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start">
                            <span className="text-blue-600 dark:text-blue-400 mr-2 font-semibold">{i + 1}.</span>
                            <span>{typeof q === 'string' ? q : JSON.stringify(q)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {JSON.stringify(detailModal.questions, null, 2)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewHistory;


