import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Building2, BookOpen, FileUser, Sparkles, Upload, CheckCircle, Save, AlertCircle, BrainCircuit, Eye, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mammoth from 'mammoth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010';

const Interview = ({ prefillKeywords, username }) => {
  const [mode, setMode] = useState(prefillKeywords ? 'self' : 'company'); // company, self, resume
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluation, setEvaluation] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [resumeAnalysis, setResumeAnalysis] = useState(null);
  
  // 知识库相关状态
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loadingKBList, setLoadingKBList] = useState(false);
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(false);
  const [selectedKBForInterview, setSelectedKBForInterview] = useState('');
  
  // 简历模式标签页状态
  const [resumeTab, setResumeTab] = useState('upload'); // upload, analysis, sync
  
  const [formData, setFormData] = useState({
    company_name: '阿里巴巴',
    position: 'Java后端开发',
    difficulty: '中级',
    question_count: 5,
    keywords: prefillKeywords || '',
  });

  useEffect(() => {
    if (prefillKeywords) {
      setMode('self');
      setFormData(prev => ({ ...prev, keywords: prefillKeywords }));
    }
    // 加载知识库列表
    loadKnowledgeBasesData();
  }, [prefillKeywords]);

  const loadKnowledgeBasesData = async () => {
    setLoadingKBList(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/knowledge_bases/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.code === 200) {
        setKnowledgeBases(data.data || []);
      }
    } catch (error) {
      console.error('加载知识库列表失败:', error);
    } finally {
      setLoadingKBList(false);
    }
  };

  const scrollRef = useRef(null);
  const evalScrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content]);

  useEffect(() => {
    if (evalScrollRef.current) {
      evalScrollRef.current.scrollTop = evalScrollRef.current.scrollHeight;
    }
  }, [evaluation]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    setResumeFile(file);
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
      } else {
        setPreviewContent('');
      }
    }
  };

  const startInterview = async () => {
    setLoading(true);
    setContent('');
    setEvaluation('');
    setIsSaved(false);
    
    let url = '';
    let body = {};

    if (mode === 'company') {
      url = `${API_BASE_URL}/interview/company/generate_company_questions/`;
      body = {
        company_name: formData.company_name,
        position: formData.position,
        difficulty: formData.difficulty,
        question_count: parseInt(formData.question_count),
        user_id: username || 'guest'
      };
    } else if (mode === 'self') {
      url = `${API_BASE_URL}/interview/self/generate_self_interview/`;
      body = {
        keywords: formData.keywords,
        difficulty: formData.difficulty,
        question_count: parseInt(formData.question_count),
        knowlage_name: useKnowledgeBase && selectedKBForInterview ? selectedKBForInterview : "[]",
        history: [],
        user_id: username || 'guest'
      };
    } else if (mode === 'resume') {
      if (!resumeFile) {
        alert('请先上传简历');
        setLoading(false);
        return;
      }
      
      // Upload resume with retry logic
      const uploadFormData = new FormData();
      uploadFormData.append('file', resumeFile);
      
      const maxRetries = 3;
      let lastError = null;
      
      for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
        try {
          console.log(`尝试上传简历，重试次数: ${retryCount}`);
          
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/interview/resume/upload_resume/`, {
            method: 'POST',
            body: uploadFormData,
            headers: {
              'Authorization': `Bearer ${token}`
              // 让浏览器自动设置 multipart/form-data
            },
            signal: AbortSignal.timeout(60000) // 60秒超时
          });
          
          if (!response.ok) {
            throw new Error(`服务器错误: ${response.status} ${response.statusText}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let jsonAnalysis = null;
          let hasContent = false;

          while (true) {
            try {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;
              
              // 处理 SSE 格式: data: {json}\n\n
              const lines = buffer.split('\n\n');
              buffer = lines[lines.length - 1]; // 保留未完成的行
              
              // 处理完成的行
              for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (line.startsWith('data: ')) {
                  try {
                    const jsonStr = line.slice(6); // 移除 'data: ' 前缀
                    const data = JSON.parse(jsonStr);
                    
                    // 检查是否是错误响应
                    if (data.error) {
                      console.error('服务器错误:', data.error);
                      lastError = new Error(data.error);
                      break;
                    }
                    
                    // 检查是否是简历分析的JSON（包含basic_info或其他分析字段）
                    if (data.basic_info || data.technical_skills || data.project_experience || data.match_score) {
                      // 这是简历分析结果
                      jsonAnalysis = data;
                      hasContent = true;
                      console.log('检测到简历分析结果:', jsonAnalysis);
                    } else if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                      // 这是流式文本内容
                      setContent(prev => prev + data.choices[0].delta.content);
                      hasContent = true;
                    }
                  } catch (parseErr) {
                    // 解析错误时跳过，但记录日志
                    console.debug('JSON解析失败:', parseErr.message, line.slice(0, 100));
                  }
                }
              }
            } catch (readErr) {
              console.error('流读取失败:', readErr);
              lastError = readErr;
              break;
            }
          }
          
          // 如果成功处理了数据，设置结果并退出重试循环
          if (jsonAnalysis) {
            setResumeAnalysis(jsonAnalysis);
            setResumeTab('analysis'); // 自动切换到分析结果标签
            console.log('简历分析已设置');
            setLoading(false);
            return;
          }
          
          // 如果有其他内容但没有JSON分析，也认为成功
          if (hasContent) {
            console.log('简历上传完成，但未获取到结构化分析结果');
            setLoading(false);
            return;
          }
          
          // 如果没有获取到分析结果，抛出错误以触发重试
          if (lastError) {
            throw lastError;
          }
          throw new Error('未能获取简历分析结果');
          
        } catch (error) {
          lastError = error;
          console.error(`上传尝试 ${retryCount + 1} 失败:`, error);
          
          if (retryCount < maxRetries - 1) {
            // 计算延迟（指数退避）
            const delay = Math.pow(2, retryCount) * 1000;
            console.log(`等待 ${delay}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // 所有重试都失败了
      setContent('简历处理失败，请检查网络连接并重试。错误: ' + (lastError?.message || '未知错误'));
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error('请求失败');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // 处理 SSE 格式: data: {json}\n\n
        const lines = buffer.split('\n\n');
        buffer = lines[lines.length - 1]; // 保留未完成的行
        
        // 处理完成的行
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6); // 移除 'data: ' 前缀
              const data = JSON.parse(jsonStr);
              
              // 从 SSE 响应中提取文本内容
              if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                setContent(prev => prev + data.choices[0].delta.content);
              }
            } catch (e) {
              // 解析错误时跳过
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setContent(prev => prev + '\n\n**错误: 无法连接到服务器，请确保后端服务已启动。**');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim()) return;
    setEvaluating(true);
    setEvaluation('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/interview/weakness/submit_answer/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: content.split('\n')[0] || "面试题", // 简单取第一行作为题目
          user_answer: userAnswer
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // 处理 SSE 格式: data: {json}\n\n
        const lines = buffer.split('\n\n');
        buffer = lines[lines.length - 1]; // 保留未完成的行
        
        // 处理完成的行
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6); // 移除 'data: ' 前缀
              const data = JSON.parse(jsonStr);
              
              // 从 SSE 响应中提取文本内容
              if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                setEvaluation(prev => prev + data.choices[0].delta.content);
              }
            } catch (e) {
              // 解析错误时跳过
            }
          }
        }
      }
    } catch (error) {
      console.error('Eval Error:', error);
    } finally {
      setEvaluating(false);
    }
  };

  // 计算简历评分
  const calculateResumeScore = (analysis) => {
    if (!analysis) return 0;
    
    let score = 60; // 基础分
    
    // 基本信息
    if (analysis.basic_info) {
      if (analysis.basic_info.work_years > 0) score += 10;
      if (analysis.basic_info.education === '硕士' || analysis.basic_info.education === '博士') score += 5;
    }
    
    // 技术技能
    if (analysis.technical_skills && analysis.technical_skills.length > 0) {
      score += Math.min(analysis.technical_skills.length * 3, 15);
    }
    
    // 项目经验
    if (analysis.project_experience && analysis.project_experience.length > 0) {
      score += Math.min(analysis.project_experience.length * 3, 15);
    }
    
    return Math.min(score, 100);
  };

  const resumeScore = resumeAnalysis ? calculateResumeScore(resumeAnalysis) : 0;

  const saveToWrongAnswers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/interview/weakness/save_evaluation/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: username || 'guest',
          question: content.split('\n')[0] || "面试题",
          user_answer: userAnswer,
          ai_feedback: evaluation,
          knowledge_point: formData.keywords || formData.position || "通用"
        })
      });
      if (response.ok) {
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Save Error:', error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { id: 'company', name: '公司题库', icon: Building2, desc: '针对特定公司岗位的面试题' },
          { id: 'self', name: '自选知识点', icon: BookOpen, desc: '根据关键词生成专项练习' },
          { id: 'resume', name: '简历定制', icon: FileUser, desc: '基于你的简历深度挖掘' },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col items-start text-left group relative overflow-hidden ${
              mode === m.id 
                ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-xl shadow-indigo-100 dark:shadow-none ring-4 ring-indigo-50 dark:ring-indigo-900/20' 
                : 'border-transparent bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 shadow-sm'
            }`}
          >
            <div className={`p-3 rounded-2xl mb-4 transition-colors ${
              mode === m.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
            }`}>
              <m.icon size={24} />
            </div>
            <h3 className={`font-bold text-lg ${mode === m.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>
              {m.name}
            </h3>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{m.desc}</p>
            {mode === m.id && (
              <div className="absolute top-4 right-4">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Config Panel */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {mode === 'company' && (
            <>
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center">
                  <Building2 size={16} className="mr-2 text-indigo-500" />
                  公司名称
                </label>
                <input 
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-medium"
                  placeholder="例如：阿里巴巴"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center">
                  <Sparkles size={16} className="mr-2 text-indigo-500" />
                  应聘岗位
                </label>
                <input 
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-medium"
                  placeholder="例如：Java后端开发"
                />
              </div>
            </>
          )}

          {mode === 'self' && (
            <>
              <div className="col-span-2 space-y-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center">
                  <BookOpen size={16} className="mr-2 text-indigo-500" />
                  考察关键词
                </label>
                <input 
                  name="keywords"
                  value={formData.keywords}
                  onChange={handleInputChange}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-medium"
                  placeholder="例如：Redis缓存优化, JVM调优, 分布式事务"
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">难度等级</label>
                <div className="grid grid-cols-4 gap-2">
                  {['初级', '中级', '高级', '资深'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setFormData(prev => ({ ...prev, difficulty: d }))}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                        formData.difficulty === d 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">题目数量</label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      onClick={() => setFormData(prev => ({ ...prev, question_count: num }))}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                        formData.question_count === num 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {num} 道
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useKnowledgeBase}
                        onChange={(e) => {
                          setUseKnowledgeBase(e.target.checked);
                          if (!e.target.checked) {
                            setSelectedKBForInterview('');
                          }
                        }}
                        className="w-5 h-5 rounded accent-indigo-600"
                      />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        使用我的知识库增强题目
                      </span>
                    </label>
                    
                    {useKnowledgeBase && (
                      <div className="ml-8 space-y-2">
                        {loadingKBList ? (
                          <div className="flex items-center justify-center py-3">
                            <Loader2 className="animate-spin text-indigo-500 mr-2" size={16} />
                            <span className="text-sm text-slate-500">加载知识库...</span>
                          </div>
                        ) : knowledgeBases.length === 0 ? (
                          <div className="text-sm text-slate-500 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                            还没有上传任何知识库，请先在知识库模块上传
                          </div>
                        ) : (
                          <select
                            value={selectedKBForInterview}
                            onChange={(e) => setSelectedKBForInterview(e.target.value)}
                            className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">-- 选择知识库 --</option>
                            {knowledgeBases.map((kb) => (
                              <option key={kb.name} value={kb.name}>
                                {kb.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {mode === 'resume' && (
            <div className="col-span-2">
              {/* 标签页导航 */}
              <div className="flex space-x-2 mb-6">
                {[
                  { id: 'upload', name: '上传简历', icon: Upload },
                  { id: 'analysis', name: '分析结果', icon: BrainCircuit },
                  { id: 'sync', name: '同步简历分析', icon: CheckCircle }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setResumeTab(tab.id)}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 ${
                      resumeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    <tab.icon size={18} />
                    <span>{tab.name}</span>
                  </button>
                ))}
              </div>

              {/* 上传简历标签 */}
              {resumeTab === 'upload' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 左侧：上传区域 */}
                  <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-6 border-2 border-dashed border-indigo-200 dark:border-indigo-800">
                    <div className="space-y-6">
                      <div className="text-center">
                        {resumeFile ? (
                          <div className="flex flex-col items-center space-y-3">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                              <CheckCircle className="text-green-600" size={32} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">文件已选择</p>
                              <p className="text-xs text-slate-500 mt-1 truncate max-w-[200px]">{resumeFile.name}</p>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full w-full"></div>
                            </div>
                            {resumeFile && (
                              <button 
                                onClick={() => setShowPreview(true)}
                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                              >
                                <Eye size={14} />
                                <span>查看预览</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            <input 
                              type="file"
                              onChange={handleFileChange}
                              accept=".pdf,.doc,.docx"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center space-y-3 py-8">
                              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                                <Upload className="text-indigo-600" size={32} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">点击上传简历</p>
                                <p className="text-xs text-slate-500 mt-1">支持 PDF、Word 格式</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">目标职位</label>
                        <input 
                          type="text"
                          value={formData.position}
                          onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                          placeholder="例如：大数据应用工程师"
                          className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">难度等级</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['初级', '中级', '高级', '资深'].map((d) => (
                            <button
                              key={d}
                              onClick={() => setFormData(prev => ({ ...prev, difficulty: d }))}
                              className={`py-2 rounded-lg text-sm font-bold transition-all ${
                                formData.difficulty === d 
                                  ? 'bg-indigo-600 text-white shadow-md' 
                                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-600'
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={startInterview}
                        disabled={loading || !resumeFile}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="animate-spin" size={18} />
                            <span>分析中...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={18} />
                            <span>开始分析</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 右侧：分析结果预览 */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                    {resumeAnalysis ? (
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                          <CheckCircle className="text-green-500 mr-2" size={20} />
                          分析结果
                        </h3>
                        <div className="text-center py-8">
                          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white mb-4">
                            <div className="text-2xl font-black">{resumeScore}%</div>
                          </div>
                          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">整体匹配度</p>
                        </div>
                        <button
                          onClick={() => setResumeTab('analysis')}
                          className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
                        >
                          查看详细分析 →
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                          <BrainCircuit className="text-slate-400" size={32} />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">上传简历后将显示分析结果</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 分析结果标签 */}
              {resumeTab === 'analysis' && resumeAnalysis && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800">
                  <div className="space-y-6">
                    {/* 整体匹配度 */}
                    <div className="text-center pb-6 border-b border-slate-200 dark:border-slate-700">
                      <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white mb-4">
                        <div className="text-4xl font-black">{resumeScore}%</div>
                      </div>
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-300">整体匹配度</p>
                    </div>

                    {/* 详细分析 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 基本信息 */}
                      {resumeAnalysis.basic_info && (
                        <div className="space-y-3">
                          <h4 className="font-bold text-slate-800 dark:text-white flex items-center">
                            <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center text-xs mr-2">📋</span>
                            基本信息分析
                          </h4>
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2 text-sm">
                            {resumeAnalysis.basic_info.education && (
                              <div><span className="text-slate-500">学历：</span><span className="font-medium text-slate-700 dark:text-slate-200">{resumeAnalysis.basic_info.education}</span></div>
                            )}
                            {resumeAnalysis.basic_info.major && (
                              <div><span className="text-slate-500">专业：</span><span className="font-medium text-slate-700 dark:text-slate-200">{resumeAnalysis.basic_info.major}</span></div>
                            )}
                            {resumeAnalysis.basic_info.work_years > 0 && (
                              <div><span className="text-slate-500">工作年限：</span><span className="font-medium text-slate-700 dark:text-slate-200">{resumeAnalysis.basic_info.work_years} 年</span></div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 匹配度分析 */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center">
                          <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center text-xs mr-2">📊</span>
                          岗位匹配度
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-600 dark:text-slate-400">技术匹配</span>
                              <span className="font-bold text-indigo-600">{resumeAnalysis.match_score?.technical || 0}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{width: `${resumeAnalysis.match_score?.technical || 0}%`}}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-600 dark:text-slate-400">项目经验</span>
                              <span className="font-bold text-violet-600">{resumeAnalysis.match_score?.experience || 0}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div className="bg-violet-500 h-2 rounded-full transition-all" style={{width: `${resumeAnalysis.match_score?.experience || 0}%`}}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 技术栈 */}
                    {resumeAnalysis.technical_skills && resumeAnalysis.technical_skills.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center">
                          <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 flex items-center justify-center text-xs mr-2">💻</span>
                          技术栈标签
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {resumeAnalysis.technical_skills.slice(0, 10).map((skill, idx) => (
                            <span key={idx} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 建议改进 */}
                    {resumeAnalysis.improvement_suggestions && resumeAnalysis.improvement_suggestions.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center">
                          <span className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 flex items-center justify-center text-xs mr-2">💡</span>
                          改进建议
                        </h4>
                        <ul className="space-y-2">
                          {resumeAnalysis.improvement_suggestions.map((suggestion, idx) => (
                            <li key={idx} className="flex items-start text-sm text-slate-600 dark:text-slate-400">
                              <span className="text-indigo-500 mr-2">•</span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 同步简历分析标签 */}
              {resumeTab === 'sync' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="text-blue-600" size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">同步简历分析</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">将您的简历分析结果同步到个人档案</p>
                    <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all">
                      立即同步
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'company' && (
            <>
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">题目数量</label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      onClick={() => setFormData(prev => ({ ...prev, question_count: num }))}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                        formData.question_count === num 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {num} 道
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">难度等级</label>
                <div className="grid grid-cols-4 gap-2">
                  {['初级', '中级', '高级', '资深'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setFormData(prev => ({ ...prev, difficulty: d }))}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                        formData.difficulty === d 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {mode !== 'resume' && (
          <button 
            onClick={startInterview}
            disabled={loading}
            className="w-full mt-10 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center space-x-3 disabled:opacity-50 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
            <span className="text-lg">{loading ? 'AI 正在为您定制面试题...' : '立即开始面试'}</span>
          </button>
        )}
      </div>

      {/* Output Area - 只在非 resume 模式或 resumeTab 不是 upload/analysis 时显示 */}
      {mode !== 'resume' && (content || loading) && (
        <div className={`grid gap-8 animate-in slide-in-from-bottom-8 duration-500 ${
          resumeAnalysis && content ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'
        }`}>
          {/* Resume Analysis Area */}
          {resumeAnalysis && (
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-[2rem] border border-indigo-200 dark:border-indigo-800/50 shadow-xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-indigo-200 dark:border-indigo-800/50 bg-gradient-to-r from-indigo-600 to-violet-600 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
                    <FileUser size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">简历分析</h4>
                    <p className="text-xs text-white/80 font-medium">智能评估</p>
                  </div>
                </div>
              </div>

              <div className="p-8 overflow-y-auto space-y-6">
                {/* 总体评分 */}
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border-2 border-indigo-100 dark:border-indigo-800/30">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-bold text-slate-800 dark:text-white">综合评分</h5>
                    <div className="flex items-center space-x-2">
                      <div className="text-3xl font-black text-indigo-600">{resumeScore}</div>
                      <div className="text-sm text-slate-500">/100</div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-violet-500 h-3 rounded-full transition-all duration-500" 
                      style={{width: `${resumeScore}%`}}
                    ></div>
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>基础</span>
                    <span>优秀</span>
                  </div>
                </div>

                {/* 基本信息 */}
                {resumeAnalysis.basic_info && (
                  <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50">
                    <h5 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                      <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center text-xs font-bold mr-2">1</span>
                      基本信息
                    </h5>
                    <div className="space-y-3">
                      {resumeAnalysis.basic_info.education && (
                        <div className="flex items-start space-x-3">
                          <span className="text-indigo-500 font-bold text-lg">📚</span>
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400">学历</p>
                            <p className="text-slate-700 dark:text-slate-200 font-medium">{resumeAnalysis.basic_info.education}</p>
                          </div>
                        </div>
                      )}
                      {resumeAnalysis.basic_info.major && (
                        <div className="flex items-start space-x-3">
                          <span className="text-violet-500 font-bold text-lg">🎓</span>
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400">专业</p>
                            <p className="text-slate-700 dark:text-slate-200 font-medium">{resumeAnalysis.basic_info.major}</p>
                          </div>
                        </div>
                      )}
                      {resumeAnalysis.basic_info.work_years > 0 && (
                        <div className="flex items-start space-x-3">
                          <span className="text-orange-500 font-bold text-lg">⏱️</span>
                          <div className="flex-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400">工作年限</p>
                            <p className="text-slate-700 dark:text-slate-200 font-medium">{resumeAnalysis.basic_info.work_years} 年</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 技术技能 */}
                {resumeAnalysis.technical_skills && resumeAnalysis.technical_skills.length > 0 && (
                  <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50">
                    <h5 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                      <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 flex items-center justify-center text-xs font-bold mr-2">2</span>
                      技术技能
                    </h5>
                    <div className="space-y-3">
                      {resumeAnalysis.technical_skills.slice(0, 4).map((skill, idx) => (
                        <div key={idx} className="flex items-start space-x-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-slate-700 dark:text-slate-200 font-bold">{skill.category}</p>
                              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                                skill.proficiency === '精通' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                                skill.proficiency === '熟练' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
                                'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}>
                                {skill.proficiency}
                              </span>
                            </div>
                            {skill.skills && (
                              <div className="flex flex-wrap gap-2">
                                {skill.skills.slice(0, 3).map((s, i) => (
                                  <span key={i} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-lg font-medium">
                                    {s}
                                  </span>
                                ))}
                                {skill.skills.length > 3 && (
                                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-lg font-medium">
                                    +{skill.skills.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 项目经验 */}
                {resumeAnalysis.project_experience && resumeAnalysis.project_experience.length > 0 && (
                  <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50">
                    <h5 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                      <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center text-xs font-bold mr-2">3</span>
                      项目经验
                    </h5>
                    <div className="space-y-3">
                      {resumeAnalysis.project_experience.slice(0, 2).map((project, idx) => (
                        <div key={idx} className="border-l-4 border-purple-500 pl-4 py-2">
                          <p className="font-semibold text-slate-800 dark:text-white">{project.project_name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{project.description}</p>
                          {project.tech_stack && project.tech_stack.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {project.tech_stack.slice(0, 3).map((tech, i) => (
                                <span key={i} className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-medium">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 重点关注领域 */}
                {resumeAnalysis.focus_areas && resumeAnalysis.focus_areas.length > 0 && (
                  <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50">
                    <h5 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                      <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center text-xs font-bold mr-2">4</span>
                      重点关注
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {resumeAnalysis.focus_areas.map((area, idx) => (
                        <span key={idx} className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-4 py-2 rounded-full text-sm font-semibold border border-amber-200 dark:border-amber-800/50">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Question Area */}
          {content && (
            <div className={`bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col ${
              resumeAnalysis ? 'lg:col-span-2' : ''
            } min-h-[500px]`}>
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">面试题目</h4>
                    <p className="text-xs text-slate-500 font-medium">AI 实时生成</p>
                  </div>
                </div>
              </div>
              <div 
                ref={scrollRef}
                className="p-8 overflow-y-auto prose dark:prose-invert max-w-none prose-indigo prose-p:leading-relaxed"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
                {loading && !content && (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="animate-spin text-indigo-500" size={40} />
                    <p className="text-slate-500 font-medium animate-pulse">正在连接 AI 引擎...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Answer & Evaluation Area */}
          {(content || resumeAnalysis) && (
            <div className="flex flex-col space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl p-8 flex flex-col flex-1">
                <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                  <Send size={18} className="mr-2 text-indigo-500" />
                  你的回答
                </h4>
                <textarea 
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="在此输入你的回答，点击下方按钮获取 AI 评估..."
                  className="flex-1 w-full p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none font-medium text-slate-700 dark:text-slate-200"
                />
                <button 
                  onClick={submitAnswer}
                  disabled={evaluating || !userAnswer.trim()}
                  className="mt-4 w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {evaluating ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
                  <span>{evaluating ? 'AI 正在评估中...' : '提交回答并评估'}</span>
                </button>
              </div>

              {evaluation && (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-green-50/30 dark:bg-green-900/10 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center text-green-600">
                        <CheckCircle size={20} />
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-white">AI 评估反馈</h4>
                    </div>
                    <button 
                      onClick={saveToWrongAnswers}
                      disabled={isSaved}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isSaved ? 'bg-green-500 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      }`}
                    >
                      {isSaved ? <CheckCircle size={14} /> : <Save size={14} />}
                      <span>{isSaved ? '已存入错题册' : '存入错题册'}</span>
                    </button>
                  </div>
                  <div 
                    ref={evalScrollRef}
                    className="p-8 overflow-y-auto max-h-[300px] prose dark:prose-invert max-w-none text-sm leading-relaxed"
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {evaluation}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[80vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center space-x-3">
                <FileUser className="text-indigo-600" size={24} />
                <h4 className="font-bold text-slate-800 dark:text-white truncate max-w-md">{resumeFile?.name}</h4>
              </div>
              <button 
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-8">
              {isPreviewLoading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
                  <p className="text-slate-500 font-medium">正在解析简历文档...</p>
                </div>
              ) : resumeFile?.type === 'application/pdf' ? (
                <iframe src={previewUrl} className="w-full h-[60vh] rounded-xl border border-slate-200 dark:border-slate-700" />
              ) : resumeFile?.name.endsWith('.docx') ? (
                <div 
                  className="p-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 prose dark:prose-invert max-w-none word-preview"
                  dangerouslySetInnerHTML={{ __html: previewContent }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <AlertCircle size={48} className="mb-4 opacity-20" />
                  <p className="font-medium">该文件类型暂不支持直接预览</p>
                  <p className="text-xs mt-2">PDF 和 Word (.docx) 文件支持直接预览</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interview;
