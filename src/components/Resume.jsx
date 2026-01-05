import React, { useState, useRef } from 'react';
import { 
  Upload, Eye, FileText, CheckCircle, AlertCircle, Loader2, X, Download, Send,
  Target, BarChart3, BrainCircuit, Sparkles, Zap, Search, Layout, Layers, Globe,
  Briefcase, GraduationCap, Award, TrendingUp, ChevronRight, MessageSquare
} from 'lucide-react';
import mammoth from 'mammoth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010';

const ResumeModule = ({ username }) => {
  // 简历管理状态
  const [resumeFile, setResumeFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [resumeAnalysis, setResumeAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload'); // upload, analysis, sync
  const [subTab, setSubTab] = useState('single'); // single, batch, web
  const [syncStatus, setSyncStatus] = useState('');
  
  // 岗位匹配相关
  const [targetPosition, setTargetPosition] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  
  // 面试相关状态
  const [startResumeInterview, setStartResumeInterview] = useState(false);
  const [interviewContent, setInterviewContent] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluation, setEvaluation] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const scrollRef = useRef(null);
  const evalScrollRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    setResumeFile(file);
    setSyncStatus('');
    
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      if (file.name.endsWith('.docx')) {
        setIsPreviewLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
          const arrayBuffer = e.target.result;
          try {
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setPreviewContent(result.value);
          } catch (err) {
            console.error('Word preview error:', err);
            setPreviewContent('<p className="text-red-500">简历解析失败</p>');
          } finally {
            setIsPreviewLoading(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (file.name.endsWith('.pdf')) {
        setPreviewContent('<p className="text-blue-500">PDF 文件预览: 请点击"查看预览"按钮</p>');
      } else {
        setIsPreviewLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewContent(e.target.result);
          setIsPreviewLoading(false);
        };
        reader.readAsText(file);
      }
    }
  };

  const handlePreviewClick = () => {
    setShowPreview(!showPreview);
  };

  // 上传并分析简历
  const uploadAndAnalyzeResume = async () => {
    if (!resumeFile) {
      alert('请先选择简历文件');
      return;
    }

    setLoading(true);
    setSyncStatus('正在上传和分析简历...');
    
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', resumeFile);
      if (targetPosition) uploadFormData.append('target_position', targetPosition);
      if (jobDescription) uploadFormData.append('job_description', jobDescription);
      
      const token = localStorage.getItem('token');
      console.log('开始上传简历...');
      
      const response = await fetch(`${API_BASE_URL}/interview/resume/upload_resume/`, {
        method: 'POST',
        body: uploadFormData,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: AbortSignal.timeout(60000)
      });

      console.log('响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('服务器响应错误:', errorText);
        throw new Error(`上传失败: ${response.status} - ${errorText}`);
      }

      // 检查是否是流式响应
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      if (contentType && contentType.includes('text/event-stream')) {
        // SSE 流式响应处理
        console.log('处理 SSE 流式响应...');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let jsonAnalysis = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('流读取完成');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          console.log('收到数据块:', chunk.substring(0, 100));

          const lines = buffer.split('\n\n');
          buffer = lines[lines.length - 1];

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              
              // 跳过空数据
              if (!jsonStr) continue;
              
              try {
                const data = JSON.parse(jsonStr);
                
                // 兼容多种返回格式：直接的对象或包含 analysis 字段的对象
                if (data.analysis) {
                  jsonAnalysis = data.analysis;
                  console.log('✅ 找到分析结果 (data.analysis)');
                } else if (data.basic_info || data.technical_skills || data.match_score) {
                  jsonAnalysis = data;
                  console.log('✅ 找到分析结果 (direct object)');
                } else if (data.choices && data.choices[0]?.delta?.content) {
                  // 这是流式内容块，暂时跳过
                  continue;
                } else if (data.choices && data.choices[0]?.finish_reason === 'stop') {
                  // 流结束标记
                  console.log('📝 流结束标记');
                  continue;
                } else if (data.error) {
                  // 错误响应
                  throw new Error(data.error);
                }
              } catch (e) {
                // 只有在JSON解析失败时才警告，不影响流程
                if (e.message !== 'Unexpected end of JSON input') {
                  console.warn('JSON 解析失败:', e.message, jsonStr.substring(0, 50));
                }
              }
            }
          }
        }

        console.log('流读取完成，检查分析结果...');
        if (jsonAnalysis) {
          setResumeAnalysis(jsonAnalysis);
          setSyncStatus('✅ 简历分析完成');
          console.log('✅ 简历分析成功:', jsonAnalysis);
        } else {
          console.error('⚠️ 未能从流中提取到简历分析结果');
          throw new Error('无法从流中解析简历分析结果，请检查简历格式或重试');
        }
      } else {
        // 普通 JSON 响应处理
        console.log('处理普通 JSON 响应...');
        const data = await response.json();
        console.log('JSON 响应:', data);
        
        if (data.analysis) {
          setResumeAnalysis(data.analysis);
          setActiveTab('analysis');
          setSyncStatus('✅ 简历分析完成');
        } else if (data.code === 200 && data.data) {
          setResumeAnalysis(data.data);
          setActiveTab('analysis');
          setSyncStatus('✅ 简历分析完成');
        } else {
          throw new Error(data.message || '解析响应失败');
        }
      }
    } catch (error) {
      console.error('简历分析失败:', error);
      setSyncStatus(`❌ 错误: ${error.message}`);
      alert(`简历分析失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 同步到个人档案
  const syncResumeToProfile = async () => {
    if (!resumeAnalysis) {
      alert('暂无分析数据可同步');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // 转换数据格式以匹配数据库模型
      const syncData = {
        education: resumeAnalysis.basic_info?.education || '未提供',
        major: resumeAnalysis.basic_info?.major || '未提供',
        work_years: resumeAnalysis.basic_info?.work_years || 0,
        // 将数组转换为JSON对象格式
        technical_skills: {
          skills: resumeAnalysis.technical_skills || []
        },
        project_experience: {
          projects: Array.isArray(resumeAnalysis.project_experience) 
            ? resumeAnalysis.project_experience 
            : (resumeAnalysis.project_experience?.projects || [])
        },
        technical_score: resumeAnalysis.match_score?.technical || 0,
        experience_score: resumeAnalysis.match_score?.experience || 0,
        improvement_suggestions: {
          suggestions: resumeAnalysis.improvement_suggestions || []
        }
      };
      
      console.log('准备同步数据:', syncData);

      const response = await fetch(`${API_BASE_URL}/api/user/profile/sync-resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(syncData)
      });

      console.log('同步响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('同步失败响应:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('同步结果:', result);
      
      if (result.code === 200) {
        setSyncStatus('✅ 简历分析已同步到个人档案');
        alert('✅ 简历分析已成功同步到个人档案！\n已更新：学历、专业、技能、项目经验、评分等信息。');
      } else {
        setSyncStatus(`❌ 同步失败: ${result.message || '未知错误'}`);
        alert(`❌ 同步失败: ${result.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('同步失败:', error);
      setSyncStatus(`❌ 同步错误: ${error.message}`);
      alert(`❌ 同步错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 开始简历定制面试
  const startResumeInterviewMode = async () => {
    if (!resumeFile) {
      alert('请先上传简历');
      return;
    }

    if (!resumeAnalysis) {
      alert('请先分析简历');
      return;
    }

    setStartResumeInterview(true);
    setLoading(true);
    setInterviewContent('');

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', resumeFile);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/interview/resume/upload_resume/`, {
        method: 'POST',
        body: uploadFormData,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) {
        throw new Error(`上传失败: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n\n');
        buffer = lines[lines.length - 1];

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            fullContent += jsonStr;
            try {
              const data = JSON.parse(jsonStr);
              if (data.content) {
                setInterviewContent(prev => prev + data.content);
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
              }
            } catch (e) {
              // 继续处理
            }
          }
        }
      }
    } catch (error) {
      console.error('启动面试失败:', error);
      setInterviewContent(`启动面试失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 提交答案
  const submitAnswer = async () => {
    if (!userAnswer.trim()) {
      alert('请输入您的答案');
      return;
    }

    setIsEvaluating(true);
    setEvaluation('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/interview/resume/evaluate_answer/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: interviewContent,
          user_answer: userAnswer,
          resume_analysis: resumeAnalysis
        })
      });

      if (!response.ok) {
        throw new Error(`评估失败: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n\n');
        buffer = lines[lines.length - 1];

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const data = JSON.parse(jsonStr);
              if (data.content) {
                setEvaluation(prev => prev + data.content);
                if (evalScrollRef.current) {
                  evalScrollRef.current.scrollTop = evalScrollRef.current.scrollHeight;
                }
              }
            } catch (e) {
              // 继续处理
            }
          }
        }
      }
    } catch (error) {
      console.error('提交答案失败:', error);
      setEvaluation(`提交失败: ${error.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const resetResume = () => {
    setResumeFile(null);
    setPreviewUrl(null);
    setPreviewContent('');
    setShowPreview(false);
    setResumeAnalysis(null);
    setSyncStatus('');
    setStartResumeInterview(false);
    setInterviewContent('');
    setUserAnswer('');
    setEvaluation('');
    setIsSaved(false);
  };

  // ==================== UI 渲染 ====================

  if (startResumeInterview && resumeAnalysis) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* 回到简历管理 */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStartResumeInterview(false)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-all shadow-sm"
          >
            <X size={18} />
            <span className="font-bold text-sm">退出面试模式</span>
          </button>
          <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">简历定制面试中</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 问题展示 */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none flex flex-col h-[600px]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                <MessageSquare size={20} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                面试问题
              </h3>
            </div>
            
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl border border-slate-100 dark:border-slate-800/50 prose dark:prose-invert max-w-none"
            >
              {interviewContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {interviewContent}
                </ReactMarkdown>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="animate-spin mb-4" size={32} />
                  <p className="font-bold">AI 正在根据您的简历生成定制化问题...</p>
                </div>
              )}
            </div>
          </div>

          {/* 答案与反馈 */}
          <div className="flex flex-col gap-8 h-[600px]">
            {/* 答案输入 */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none flex flex-col flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600">
                  <Send size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  您的回答
                </h3>
              </div>
              
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="请详细描述您的回答，AI 将根据您的回答进行深度评估..."
                className="flex-1 w-full p-6 border border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium leading-relaxed"
              />
              
              <button
                onClick={submitAnswer}
                disabled={isEvaluating || !userAnswer.trim()}
                className="w-full mt-6 py-5 bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 text-white font-black rounded-2xl disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-200 dark:shadow-none active:scale-[0.98]"
              >
                {isEvaluating ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                <span className="uppercase tracking-widest text-sm">{isEvaluating ? '正在深度评估...' : '提交回答并获取反馈'}</span>
              </button>
            </div>

            {/* 评估反馈 */}
            {evaluation && (
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-200 dark:shadow-none overflow-y-auto max-h-[250px] animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <CheckCircle size={20} />
                  </div>
                  <h3 className="text-xl font-black">AI 深度评估</h3>
                </div>
                <div className="prose prose-invert max-w-none text-sm font-medium opacity-90">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {evaluation}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== 简历管理视图 ====================

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 dark:shadow-none">
            <BrainCircuit size={32} />
          </div>
          智能简历分析系统
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
          AI 驱动的简历与岗位智能匹配分析
        </p>
      </div>

      {/* Sub Tabs */}
      <div className="flex justify-center">
        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex gap-1">
          {[
            { id: 'single', label: '单个简历分析', icon: FileText },
            { id: 'batch', label: '批量简历分析', icon: Layers },
            { id: 'web', label: '网页简历分析', icon: Globe }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                subTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none'
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Upload & Inputs */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                  <Upload size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">上传简历</h3>
              </div>

              {/* File Upload Area */}
              <div className={`relative border-2 border-dashed rounded-[2rem] p-10 text-center transition-all duration-500 ${
                resumeFile 
                  ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600'
              }`}>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  id="resume-upload"
                />
                
                {resumeFile ? (
                  <div className="space-y-4">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-xl shadow-emerald-200 dark:shadow-none animate-in zoom-in duration-500">
                      <CheckCircle size={40} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-slate-900 dark:text-white truncate max-w-[250px] mx-auto">
                        {resumeFile.name}
                      </p>
                      <p className="text-sm font-bold text-emerald-600">文件已选择</p>
                      <p className="text-xs text-slate-400 mt-1">{(resumeFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setResumeFile(null); }}
                      className="px-4 py-1.5 bg-white dark:bg-slate-800 rounded-full text-xs font-black text-red-500 border border-red-100 dark:border-red-900/30 hover:bg-red-50 transition-all relative z-20"
                    >
                      重新选择
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 mx-auto">
                      <Upload size={40} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-slate-900 dark:text-white">点击选择简历或拖拽上传</p>
                      <p className="text-sm font-medium text-slate-400 mt-1">支持 PDF、Word、TXT 格式</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Inputs */}
              <div className="mt-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">目标岗位</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={targetPosition}
                      onChange={(e) => setTargetPosition(e.target.value)}
                      placeholder="例如：大模型应用工程师"
                      className=\"w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium\"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">岗位描述</label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="粘贴岗位要求，AI 将进行精准匹配分析..."
                    className=\"w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-32 resize-none focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium\"
                  />
                </div>

                <button
                  onClick={uploadAndAnalyzeResume}
                  disabled={!resumeFile || loading}
                  className=\"w-full py-5 bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 text-white font-black rounded-2xl disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-200 dark:shadow-none active:scale-[0.98]\"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                  <span className="uppercase tracking-widest text-sm">{loading ? '正在深度分析中...' : '开始智能分析'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Analysis Results */}
          <div className="lg:col-span-7">
            {resumeAnalysis ? (
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-10 animate-in fade-in slide-in-from-right-4 duration-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600">
                      <BarChart3 size={20} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">分析结果</h3>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setStartResumeInterview(true)}
                      className=\"px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all\"
                    >
                      定制面试
                    </button>
                    <button 
                      onClick={syncResumeToProfile}
                      className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-all"
                    >
                      同步档案
                    </button>
                  </div>
                </div>

                {/* Match Score Circle */}
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="relative w-48 h-48">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle
                        className="text-slate-100 dark:text-slate-800 stroke-current"
                        strokeWidth="8"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                      />
                      <circle
                        className="text-blue-600 stroke-current transition-all duration-1000 ease-out"
                        strokeWidth="8"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * (resumeAnalysis.match_score?.overall || 0)) / 100}
                        strokeLinecap="round"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-black text-slate-900 dark:text-white">{resumeAnalysis.match_score?.overall || 0}%</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">整体匹配度</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Scores */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                          <Zap size={14} className="text-orange-500" />
                          <span className="text-sm font-black text-slate-700 dark:text-slate-200">技能匹配分析</span>
                        </div>
                        <span className="text-xs font-black text-slate-400">{resumeAnalysis.match_score?.technical || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-1000"
                          style={{ width: `${resumeAnalysis.match_score?.technical || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {resumeAnalysis.technical_skills?.slice(0, 5).map((skill, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-md text-[10px] font-bold text-slate-500">{skill}</span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                          <Briefcase size={14} className="text-blue-500" />
                          <span className="text-sm font-black text-slate-700 dark:text-slate-200">工作经验匹配</span>
                        </div>
                        <span className="text-xs font-black text-slate-400">{resumeAnalysis.match_score?.experience || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full transition-all duration-1000"
                          style={{ width: `${resumeAnalysis.match_score?.experience || 0}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400">相关年限: {resumeAnalysis.basic_info?.work_years || 0} 年</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                          <GraduationCap size={14} className="text-emerald-500" />
                          <span className="text-sm font-black text-slate-700 dark:text-slate-200">教育背景匹配</span>
                        </div>
                        <span className="text-xs font-black text-slate-400">{resumeAnalysis.match_score?.learning || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000"
                          style={{ width: `${resumeAnalysis.match_score?.learning || 0}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400">{resumeAnalysis.basic_info?.education} · {resumeAnalysis.basic_info?.major}</p>
                    </div>

                    <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={14} className="text-cyan-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI 综合评估</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        {resumeAnalysis.improvement_suggestions?.[0] || '候选人具备较强的技术背景，但在特定领域仍有提升空间。'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Improvement Suggestions */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-blue-500" />
                    改进建议
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {resumeAnalysis.improvement_suggestions?.slice(0, 4).map((sug, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
                        <ChevronRight size={14} className="text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{sug}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[600px] bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-10 text-center">
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-200 mb-8">
                  <BarChart3 size={48} />
                </div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">等待分析</h4>
                <p className="text-slate-400 max-w-xs mx-auto">
                  上传简历并填写岗位信息后，AI 将在此为您呈现深度匹配报告。
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-20 border border-slate-200 dark:border-slate-800 text-center">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-200">
            <Layout size={48} />
          </div>
          <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-4">功能开发中</h4>
          <p className="text-slate-500 max-w-md mx-auto">
            {subTab === 'batch' ? '批量简历分析功能正在内测中，敬请期待。' : '网页简历分析功能正在对接中，即将上线。'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ResumeModule;
