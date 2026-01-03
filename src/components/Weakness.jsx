import React, { useState, useEffect } from 'react';
import { BrainCircuit, History, AlertTriangle, CheckCircle, BarChart3, Loader2, Sparkles } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010';

const Weakness = ({ onStartPractice, username }) => {
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const userId = username || 'guest'; // 使用当前登录用户

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [waRes, anRes] = await Promise.all([
        fetch(`${API_BASE_URL}/interview/weakness/wrong_answers/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${API_BASE_URL}/interview/weakness/weakness_analysis/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);
      
      const waData = await waRes.json();
      const anData = await anRes.json();
      
      setWrongAnswers(waData.wrong_answers || []);
      setAnalysis(anData.analysis || null);
    } catch (error) {
      console.error('Error fetching weakness data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
        <p className="text-slate-500">正在加载薄弱点分析数据...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      {/* Analysis Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: '错题总数', value: wrongAnswers.length, icon: AlertTriangle, color: 'red', sub: '需要重点关注' },
          { label: '知识领域', value: analysis?.weak_points?.length || 0, icon: BrainCircuit, color: 'indigo', sub: '覆盖薄弱环节' },
          { label: '掌握进度', value: '65%', icon: BarChart3, color: 'green', sub: '较上周提升 12%' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className={`p-4 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400 rounded-2xl group-hover:scale-110 transition-transform`}>
                <stat.icon size={28} />
              </div>
              <span className="text-xs font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em]">{stat.label}</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <p className="text-4xl font-black text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-sm font-bold text-slate-400">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Wrong Answers List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-bold flex items-center text-slate-800 dark:text-white">
              <History className="mr-3 text-indigo-500" size={24} />
              错题记录
            </h3>
            <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">查看全部</button>
          </div>
          
          {wrongAnswers.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-slate-300" size={40} />
              </div>
              <p className="text-xl font-bold text-slate-400">暂无错题记录，你太棒了！</p>
            </div>
          ) : (
            <div className="space-y-6">
              {wrongAnswers.map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-red-500/20 group-hover:bg-red-500 transition-colors" />
                  
                  <div className="flex justify-between items-start mb-6">
                    <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-black text-slate-500 uppercase tracking-wider">
                      {item.knowledge_point || '通用知识'}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{item.timestamp}</span>
                  </div>
                  
                  <h4 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-100 leading-snug">
                    {item.question}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-red-50/30 dark:bg-red-900/10 rounded-3xl border border-red-100/50 dark:border-red-900/20">
                      <p className="text-[10px] font-black text-red-600 mb-3 uppercase tracking-[0.2em]">你的回答</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{item.user_answer}</p>
                    </div>
                    <div className="p-6 bg-green-50/30 dark:bg-green-900/10 rounded-3xl border border-green-100/50 dark:border-green-900/20">
                      <p className="text-[10px] font-black text-green-600 mb-3 uppercase tracking-[0.2em]">AI 深度解析</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{item.ai_feedback}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Analysis Sidebar */}
        <div className="space-y-8">
          <h3 className="text-2xl font-bold flex items-center text-slate-800 dark:text-white">
            <BarChart3 className="mr-3 text-indigo-500" size={24} />
            智能分析
          </h3>
          
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm sticky top-24">
            <h4 className="font-black mb-8 text-xs text-slate-400 uppercase tracking-[0.2em]">薄弱知识点分布</h4>
            
            <div className="space-y-8">
              {analysis?.weak_points?.map((point, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{point.name}</span>
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">
                      {point.count} 次错误
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-sm transition-all duration-1000" 
                      style={{ width: `${Math.min(point.count * 20, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )) || (
                <div className="py-10 text-center">
                  <p className="text-sm font-bold text-slate-400">暂无分析数据</p>
                </div>
              )}
            </div>

            <div className="mt-12 p-8 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
                <BrainCircuit size={120} />
              </div>
              <h5 className="text-xl font-bold mb-3 flex items-center">
                <Sparkles size={20} className="mr-2" />
                强化建议
              </h5>
              <p className="text-sm opacity-90 leading-relaxed font-medium mb-8">
                根据你的错题记录，建议优先复习 <strong>{analysis?.weak_points?.[0]?.name || '基础知识'}</strong> 相关内容。
              </p>
              <button 
                onClick={() => onStartPractice(analysis?.weak_points?.[0]?.name || '')}
                className="w-full py-4 bg-white text-indigo-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg active:scale-95"
              >
                开始针对性练习
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Weakness;
