import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Building2, BookOpen, FileUser, Sparkles, Upload, CheckCircle, Save, AlertCircle, BrainCircuit, Eye, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mammoth from 'mammoth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010';

const Interview = ({ prefillKeywords }) => {
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
  }, [prefillKeywords]);

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
        user_id: 'user123'
      };
    } else if (mode === 'self') {
      url = `${API_BASE_URL}/interview/self/generate_self_interview/`;
      body = {
        keywords: formData.keywords,
        difficulty: formData.difficulty,
        question_count: parseInt(formData.question_count),
        knowlage_name: "[]",
        history: [],
        user_id: 'user123'
      };
    } else if (mode === 'resume') {
      if (!resumeFile) {
        alert('请先上传简历');
        setLoading(false);
        return;
      }
      
      // First upload resume
      const uploadFormData = new FormData();
      uploadFormData.append('file', resumeFile);
      
      try {
        const uploadRes = await fetch(`${API_BASE_URL}/interview/resume/upload_resume/`, {
          method: 'POST',
          body: uploadFormData
        });
        if (!uploadRes.ok) throw new Error('简历上传失败');
        
        url = `${API_BASE_URL}/interview/resume/generate_resume_questions/`;
        body = {
          difficulty: formData.difficulty,
          question_count: parseInt(formData.question_count),
          user_id: 'user123'
        };
      } catch (error) {
        console.error('Resume Error:', error);
        setContent('简历处理失败，请重试。');
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      const response = await fetch(`${API_BASE_URL}/interview/weakness/submit_answer/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const saveToWrongAnswers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/interview/weakness/save_evaluation/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user123',
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
          )}

          {mode === 'resume' && (
            <div className="col-span-2 space-y-3">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center">
                <Upload size={16} className="mr-2 text-indigo-500" />
                上传个人简历
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 hover:border-indigo-400 transition-colors">
                  <input 
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-center space-x-2 text-slate-500">
                    <FileUser size={20} />
                    <span className="font-medium truncate max-w-[200px]">{resumeFile ? resumeFile.name : '点击上传 PDF 或 Word 简历'}</span>
                  </div>
                </div>
                {resumeFile && (
                  <button 
                    onClick={() => setShowPreview(true)}
                    className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl hover:bg-indigo-100 transition-colors flex items-center space-x-2 font-bold text-sm"
                  >
                    <Eye size={18} />
                    <span>预览</span>
                  </button>
                )}
              </div>
            </div>
          )}

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
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">题目数量 ({formData.question_count})</label>
            <input 
              type="range"
              name="question_count"
              min="1"
              max="10"
              value={formData.question_count}
              onChange={handleInputChange}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-400 font-bold">
              <span>1 题</span>
              <span>5 题</span>
              <span>10 题</span>
            </div>
          </div>
        </div>

        <button 
          onClick={startInterview}
          disabled={loading}
          className="w-full mt-10 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center space-x-3 disabled:opacity-50 transform hover:-translate-y-0.5 active:translate-y-0"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
          <span className="text-lg">{loading ? 'AI 正在为您定制面试题...' : '立即开始面试'}</span>
        </button>
      </div>

      {/* Output Area */}
      {(content || loading) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8 duration-500">
          {/* Question Area */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col min-h-[500px]">
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

          {/* Answer & Evaluation Area */}
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
