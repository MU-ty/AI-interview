import React, { useState, useRef } from 'react';
import { Upload, Eye, FileText, CheckCircle, AlertCircle, Loader2, X, Download, Send } from 'lucide-react';
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
  const [syncStatus, setSyncStatus] = useState('');
  
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
              console.log('解析 JSON:', jsonStr.substring(0, 100));
              
              try {
                const data = JSON.parse(jsonStr);
                console.log('解析结果:', data);
                
                if (data.analysis) {
                  jsonAnalysis = data.analysis;
                  console.log('找到分析结果:', jsonAnalysis);
                }
              } catch (e) {
                console.warn('JSON 解析失败:', e.message, jsonStr.substring(0, 50));
              }
            }
          }
        }

        if (jsonAnalysis) {
          setResumeAnalysis(jsonAnalysis);
          setActiveTab('analysis');
          setSyncStatus('✅ 简历分析完成');
          console.log('分析完成');
        } else {
          throw new Error('无法从流中解析简历分析结果');
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
      const syncData = {
        education: resumeAnalysis.basic_info?.education,
        major: resumeAnalysis.basic_info?.major,
        work_years: resumeAnalysis.basic_info?.work_years || 0,
        technical_skills: resumeAnalysis.technical_skills || [],
        project_experience: resumeAnalysis.project_experience,
        technical_score: resumeAnalysis.match_score?.technical || 0,
        experience_score: resumeAnalysis.match_score?.experience || 0,
        improvement_suggestions: resumeAnalysis.improvement_suggestions || []
      };

      const response = await fetch(`${API_BASE_URL}/api/user/profile/sync-resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(syncData)
      });

      const result = await response.json();
      if (result.code === 200) {
        setSyncStatus('✅ 简历分析已同步到个人档案');
        alert('✅ 简历分析已成功同步到个人档案！');
      } else {
        setSyncStatus(`❌ 同步失败: ${result.message}`);
      }
    } catch (error) {
      console.error('同步失败:', error);
      setSyncStatus(`❌ 同步错误: ${error.message}`);
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 回到简历管理 */}
        <button
          onClick={() => setStartResumeInterview(false)}
          className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          ← 返回简历管理
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 问题展示 */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              📝 面试问题
            </h3>
            <div
              ref={scrollRef}
              className="h-96 overflow-y-auto bg-slate-50 dark:bg-slate-800 p-4 rounded-lg mb-4 text-slate-700 dark:text-slate-300"
            >
              {interviewContent || (loading ? '生成中...' : '问题将在此显示')}
            </div>
          </div>

          {/* 答案与反馈 */}
          <div className="space-y-4">
            {/* 答案输入 */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                ✍️ 您的回答
              </h3>
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="请输入您的回答..."
                className="w-full h-32 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={submitAnswer}
                disabled={isEvaluating || !userAnswer.trim()}
                className="w-full mt-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg disabled:bg-gray-400 transition-all flex items-center justify-center gap-2"
              >
                {isEvaluating ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                <span>{isEvaluating ? '评估中...' : '提交回答'}</span>
              </button>
            </div>

            {/* 评估反馈 */}
            {evaluation && (
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-bold text-green-800 dark:text-green-100 mb-4 flex items-center gap-2">
                  <CheckCircle size={20} />
                  AI 评估反馈
                </h3>
                <div
                  ref={evalScrollRef}
                  className="h-48 overflow-y-auto prose dark:prose-invert max-w-none text-sm"
                >
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 标签页 */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700">
        {[
          { id: 'upload', label: '📤 上传简历', icon: Upload },
          { id: 'analysis', label: '📊 分析结果', icon: FileText },
          { id: 'sync', label: '🔄 同步档案', icon: CheckCircle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-4 font-semibold border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 上传标签页 */}
      {activeTab === 'upload' && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              📄 上传您的简历
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              支持 PDF、Word (.docx)、TXT 等格式。系统会自动分析您的简历，提取关键信息。
            </p>
          </div>

          {/* 文件上传区 */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="resume-upload"
            />
            <label htmlFor="resume-upload" className="cursor-pointer block">
              <Upload className="w-12 h-12 mx-auto mb-4 text-indigo-600" />
              <p className="text-lg font-semibold text-slate-800 dark:text-white mb-1">
                点击选择简历或拖拽上传
              </p>
              <p className="text-sm text-slate-500">支持 PDF、Word、TXT 格式</p>
            </label>
          </div>

          {/* 已选择的文件 */}
          {resumeFile && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">{resumeFile.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {(resumeFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setResumeFile(null)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 预览按钮 */}
              {previewUrl && (
                <button
                  onClick={handlePreviewClick}
                  className="w-full mt-3 py-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold flex items-center justify-center gap-2"
                >
                  <Eye size={18} />
                  {showPreview ? '隐藏预览' : '查看预览'}
                </button>
              )}

              {/* 预览内容 */}
              {showPreview && previewContent && (
                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800 max-h-48 overflow-y-auto text-sm text-slate-700 dark:text-slate-300">
                  {isPreviewLoading ? (
                    <Loader2 className="animate-spin mx-auto" />
                  ) : resumeFile.name.endsWith('.docx') ? (
                    <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                  ) : (
                    <pre className="whitespace-pre-wrap break-words">{previewContent}</pre>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-4">
            <button
              onClick={uploadAndAnalyzeResume}
              disabled={!resumeFile || loading}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg disabled:bg-gray-400 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
              <span>{loading ? '分析中...' : '分析简历'}</span>
            </button>
            {resumeFile && (
              <button
                onClick={resetResume}
                className="py-3 px-6 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                重置
              </button>
            )}
          </div>

          {/* 状态提示 */}
          {syncStatus && (
            <div className={`p-4 rounded-lg ${
              syncStatus.includes('✅')
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-100 border border-green-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-100 border border-red-200'
            }`}>
              {syncStatus}
            </div>
          )}
        </div>
      )}

      {/* 分析结果标签页 */}
      {activeTab === 'analysis' && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
          {resumeAnalysis ? (
            <>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                📊 简历分析结果
              </h2>

              {/* 基本信息 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                  👤 基本信息
                </h3>
                <div className="grid grid-cols-2 gap-4 text-slate-700 dark:text-slate-300">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">学历</p>
                    <p className="font-semibold">{resumeAnalysis.basic_info?.education || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">专业</p>
                    <p className="font-semibold">{resumeAnalysis.basic_info?.major || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">工作年限</p>
                    <p className="font-semibold">{resumeAnalysis.basic_info?.work_years || 0} 年</p>
                  </div>
                </div>
              </div>

              {/* 技能评分 */}
              {resumeAnalysis.match_score && (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: '技术能力', value: resumeAnalysis.match_score.technical },
                    { label: '项目经验', value: resumeAnalysis.match_score.experience },
                    { label: '学习能力', value: resumeAnalysis.match_score.learning },
                    { label: '综合评分', value: resumeAnalysis.match_score.overall }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{item.label}</p>
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-indigo-600">{item.value}</span>
                        <span className="text-slate-500">/100</span>
                      </div>
                      <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 技能标签 */}
              {resumeAnalysis.technical_skills && (
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-white mb-3">🛠️ 技术技能</h4>
                  <div className="flex flex-wrap gap-2">
                    {resumeAnalysis.technical_skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full text-sm font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 改进建议 */}
              {resumeAnalysis.improvement_suggestions && resumeAnalysis.improvement_suggestions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-white mb-3">💡 改进建议</h4>
                  <ul className="space-y-2">
                    {resumeAnalysis.improvement_suggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex gap-3 text-slate-700 dark:text-slate-300">
                        <span className="text-indigo-600 font-bold">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setStartResumeInterview(true)}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all"
                >
                  🎤 开始简历定制面试
                </button>
                <button
                  onClick={() => setActiveTab('sync')}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
                >
                  🔄 同步到档案
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-600 dark:text-slate-400">
                请先在"上传简历"标签页分析简历
              </p>
            </div>
          )}
        </div>
      )}

      {/* 同步标签页 */}
      {activeTab === 'sync' && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
          {resumeAnalysis ? (
            <>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                🔄 同步到个人档案
              </h2>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                  <CheckCircle size={20} />
                  即将同步以下信息
                </h3>
                <ul className="space-y-2 text-blue-800 dark:text-blue-200 text-sm">
                  <li>✓ 教育背景（学历、专业）</li>
                  <li>✓ 工作经验（工作年限）</li>
                  <li>✓ 技术技能（所有识别到的技能）</li>
                  <li>✓ 项目经历（主要项目信息）</li>
                  <li>✓ 能力评分（技术、经验、综合分数）</li>
                  <li>✓ 改进建议（针对性的发展方向）</li>
                </ul>
              </div>

              <button
                onClick={syncResumeToProfile}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg disabled:bg-gray-400 transition-all text-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>同步中...</span>
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    <span>立即同步到个人档案</span>
                  </>
                )}
              </button>

              {syncStatus && (
                <div className={`p-4 rounded-lg ${
                  syncStatus.includes('✅')
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-100 border border-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-100 border border-red-200'
                }`}>
                  {syncStatus}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-600 dark:text-slate-400">
                请先在"上传简历"标签页分析简历
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumeModule;
