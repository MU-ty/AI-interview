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
  
  // 聊天模式状态
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatMode, setIsChatMode] = useState(true); // 默认为对话模式
  
  // 知识库相关状态
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loadingKBList, setLoadingKBList] = useState(false);
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(false);
  const [selectedKBForInterview, setSelectedKBForInterview] = useState('');
  
  // 简历模式标签页状态
  const [resumeTab, setResumeTab] = useState('upload'); // upload, analysis, sync
  
  // 总结报告状态
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

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

  const handleEndInterview = async () => {
    if (chatHistory.length === 0) return;
    
    if (!window.confirm('确定要结束面试并生成总结报告吗？')) return;

    setGeneratingSummary(true);
    try {
      const token = localStorage.getItem('token');
      const endpointPrefix = mode === 'company' ? 'company' : 'self';
      const response = await fetch(`${API_BASE_URL}/interview/${endpointPrefix}/generate_interview_summary/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          history: chatHistory,
          user_id: username || 'guest'
        })
      });
      
      if (!response.ok) throw new Error('生成总结失败');
      
      const data = await response.json();
      setSummaryData(data);
      setShowSummary(true);
    } catch (error) {
      console.error(error);
      alert('生成总结报告失败，请重试');
    } finally {
      setGeneratingSummary(false);
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

  // 同步简历分析到个人档案
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

      console.log('📤 开始同步简历分析到个人档案...', syncData);

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
        console.log('✅ 简历分析已成功同步到个人档案');
        alert('✅ 简历分析已成功同步到个人档案！\n\n您可以在个人档案页面查看完整的信息。');
        // 可选：自动跳转到个人档案页面
        // window.location.href = '/profile';
      } else {
        console.error('❌ 同步失败:', result.message);
        alert(`❌ 同步失败: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ 同步错误:', error);
      alert(`❌ 同步出错: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startInterview = async () => {
    setLoading(true);
    setContent('');
    setEvaluation('');
    setUserAnswer('');
    setResumeAnalysis(null);
    setIsSaved(false);
    setChatHistory([]); // 重置聊天历史
    
    let url = '';
    let body = {};

    if (mode === 'company') {
      url = `${API_BASE_URL}/interview/company/generate_company_questions/`;
      body = {
        company_name: formData.company_name,
        position: formData.position,
        difficulty: formData.difficulty,
        question_count: parseInt(formData.question_count),
        user_id: username || 'guest',
        history: [] // 初始历史为空
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
      // ... (resume upload logic remains same)
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
          let fullResponseText = '';

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
                    console.debug('📦 原始数据:', jsonStr.substring(0, 200));
                    const data = JSON.parse(jsonStr);
                    
                    // 详细的数据类型检查
                    console.log('📊 收到数据类型:', Object.keys(data).slice(0, 5).join(', '));
                    
                    // 检查是否是错误响应
                    if (data.error) {
                      console.error('❌ 服务器错误:', data.error);
                      lastError = new Error(data.error);
                      break;
                    }
                    
                    // 检查是否是简历分析的JSON（包含basic_info或其他分析字段）
                    if (data.basic_info || data.technical_skills || data.project_experience || data.match_score) {
                      // 这是简历分析结果
                      jsonAnalysis = data;
                      hasContent = true;
                      console.log('✅ 检测到简历分析结果');
                      console.log('📊 分析字段:', {
                        has_basic_info: !!data.basic_info,
                        has_technical_skills: !!data.technical_skills,
                        has_project_experience: !!data.project_experience,
                        has_match_score: !!data.match_score
                      });
                    } else if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                      // 这是流式文本内容
                      const content = data.choices[0].delta.content;
                      setContent(prev => prev + content);
                      fullResponseText += content;
                      hasContent = true;
                      console.debug('📝 流式内容块:', content.substring(0, 50));
                    } else if (data.finish_reason) {
                      // 流结束标记
                      console.log('🏁 流处理完成');
                    } else {
                      // 记录其他类型的响应
                      console.log('📦 收到其他类型数据:', Object.keys(data));
                    }
                  } catch (parseErr) {
                    // 解析错误时跳过，但记录日志
                    console.debug('⚠️ JSON解析失败:', parseErr.message);
                    console.debug('   原始内容:', line.slice(0, 100));
                  }
                }
              }
            } catch (readErr) {
              console.error('流读取失败:', readErr);
              lastError = readErr;
              break;
            }
          }
          
          // 如果没有获取到结构化的分析结果，尝试从文本内容解析
          if (!jsonAnalysis) {
            console.log('📝 未找到结构化数据，检查文本内容...');
            console.log(`fullResponseText 长度: ${fullResponseText.length}, 内容: ${fullResponseText.substring(0, 200)}`);
            
            if (fullResponseText) {
              // 尝试从文本中提取 JSON
              const jsonMatch = fullResponseText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  const extracted = JSON.parse(jsonMatch[0]);
                  if (extracted.basic_info || extracted.technical_skills) {
                    jsonAnalysis = extracted;
                    console.log('✅ 成功从文本中提取 JSON 数据');
                  }
                } catch (e) {
                  console.log('⚠️ JSON 提取和解析失败:', e.message);
                }
              }
            }
            
            // 如果仍未获得分析结果，使用默认结构
            if (!jsonAnalysis) {
              console.log('⚠️ 使用默认的分析结果结构');
              jsonAnalysis = {
                basic_info: {
                  education: "信息待填充",
                  major: "信息待填充",
                  work_years: 0
                },
                technical_skills: ["待分析"],
                project_experience: [],
                match_score: {
                  technical: 50,
                  experience: 50
                },
                improvement_suggestions: ["请稍后重试，AI 模型正在优化分析功能"]
              };
            }
            hasContent = true;
          }
          
          // 如果成功处理了数据，设置结果并退出重试循环
          if (jsonAnalysis) {
            console.log('✅ 简历分析已设置，字段数:', Object.keys(jsonAnalysis).length);
            setResumeAnalysis(jsonAnalysis);
            setResumeTab('analysis'); // 自动切换到分析结果标签
            console.log('✅ 已切换到分析结果标签');
            setLoading(false);
            return;
          }
          
          // 如果有其他内容但没有JSON分析，也认为成功
          if (hasContent) {
            console.log('📊 简历上传完成，但未获取到结构化分析结果');
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
      let currentMessage = '';

      // 如果是对话模式，添加一条空的 AI 消息占位
      if (mode === 'company' || mode === 'self') {
        setChatHistory([{ role: 'assistant', content: '' }]);
      }

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
              
              // 检查是否是错误响应
              if (data.error) {
                console.error('❌ 服务器错误:', data.error);
                const errorMsg = `\n\n**错误: ${data.error}**`;
                if (mode === 'company' || mode === 'self') {
                   setChatHistory(prev => {
                     const newHistory = [...prev];
                     if (newHistory.length > 0) {
                       newHistory[newHistory.length - 1].content += errorMsg;
                     }
                     return newHistory;
                   });
                } else {
                   setContent(prev => prev + errorMsg);
                }
                break;
              }

              // 从 SSE 响应中提取文本内容
              if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                const newContent = data.choices[0].delta.content;
                currentMessage += newContent;
                
                if (mode === 'company' || mode === 'self') {
                  setChatHistory(prev => {
                    const newHistory = [...prev];
                    // 更新最后一条消息
                    if (newHistory.length > 0) {
                      newHistory[newHistory.length - 1].content = currentMessage;
                    }
                    return newHistory;
                  });
                } else {
                  setContent(prev => prev + newContent);
                }
              }
            } catch (e) {
              // 解析错误时跳过
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = '\n\n**错误: 无法连接到服务器，请确保后端服务已启动。**';
      if (mode === 'company' || mode === 'self') {
         setChatHistory(prev => {
           const newHistory = [...prev];
           if (newHistory.length > 0) {
             newHistory[newHistory.length - 1].content += errorMsg;
           }
           return newHistory;
         });
      } else {
         setContent(prev => prev + errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!userAnswer.trim()) return;
    
    const currentAnswer = userAnswer;
    setUserAnswer(''); // 清空输入框
    setEvaluating(true);
    
    // 添加用户消息到历史
    const newHistory = [...chatHistory, { role: 'user', content: currentAnswer }];
    setChatHistory(newHistory);
    
    // 添加 AI 思考占位
    setChatHistory(prev => [...prev, { role: 'assistant', content: '' }]);

    let url = '';
    let body = {};

    if (mode === 'company') {
      url = `${API_BASE_URL}/interview/company/generate_company_questions/`;
      body = {
        company_name: formData.company_name,
        position: formData.position,
        difficulty: formData.difficulty,
        question_count: parseInt(formData.question_count),
        user_id: username || 'guest',
        history: newHistory // 发送完整历史
      };
    } else if (mode === 'self') {
      url = `${API_BASE_URL}/interview/self/generate_self_interview/`;
      body = {
        keywords: formData.keywords,
        difficulty: formData.difficulty,
        question_count: parseInt(formData.question_count),
        knowlage_name: useKnowledgeBase && selectedKBForInterview ? selectedKBForInterview : "[]",
        history: newHistory,
        user_id: username || 'guest'
      };
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
      let currentMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n\n');
        buffer = lines[lines.length - 1];
        
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);
              
              if (data.error) {
                console.error('❌ 服务器错误:', data.error);
                setChatHistory(prev => {
                   const h = [...prev];
                   h[h.length - 1].content += `\n\n**错误: ${data.error}**`;
                   return h;
                });
                break;
              }

              if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                currentMessage += data.choices[0].delta.content;
                setChatHistory(prev => {
                  const h = [...prev];
                  h[h.length - 1].content = currentMessage;
                  return h;
                });
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setChatHistory(prev => {
         const h = [...prev];
         h[h.length - 1].content += '\n\n**错误: 无法连接到服务器**';
         return h;
      });
    } finally {
      setEvaluating(false);
    }
  };

  const submitAnswer = async () => {
    if (mode === 'company' || mode === 'self') {
        // 如果是对话模式，调用 sendChatMessage
        await sendChatMessage();
        return;
    }

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
            onClick={() => {
              // 如果正在进行面试，禁止切换模式
              if (loading || content || evaluation) {
                return;
              }
              setMode(m.id);
            }}
            disabled={loading || content || evaluation}
            className={`p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col items-start text-left group relative overflow-hidden ${
              loading || content || evaluation
                ? 'opacity-50 cursor-not-allowed'
                : ''
            } ${
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
      {mode !== 'resume' ? (
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

          <button 
            onClick={startInterview}
            disabled={loading}
            className="w-full mt-10 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center space-x-3 disabled:opacity-50 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
            <span className="text-lg">{loading ? 'AI 正在为您定制面试题...' : '立即开始面试'}</span>
          </button>
        </div>
      ) : (
        <div className="py-10">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl p-12 text-center space-y-6">
            <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center mx-auto text-indigo-600">
              <Sparkles size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">此页面已迁移</h3>
              <p className="text-slate-500 dark:text-slate-400 text-lg">
                此页面已迁移到 <span className="font-bold text-indigo-600">AI面试的简历定制模块</span>
              </p>
            </div>
            <div className="pt-4">
              <button 
                onClick={() => setMode('company')}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                返回公司面试
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Output Area - 只在非 resume 模式或 resumeTab 不是 upload/analysis 时显示 */}
      {mode !== 'resume' && (content || loading || chatHistory.length > 0) && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              {mode === 'company' ? '公司面试' : mode === 'self' ? '自选知识点面试' : '简历定制面试'}
            </h2>
            <button 
              onClick={() => {
                setContent('');
                setEvaluation('');
                setUserAnswer('');
                setResumeAnalysis(null);
                setIsSaved(false);
                setChatHistory([]);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition-all font-medium text-sm"
            >
              <X size={16} />
              <span>新面试</span>
            </button>
          </div>
          
          <div className={`grid gap-8 animate-in slide-in-from-bottom-8 duration-500 ${
            resumeAnalysis && content ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'
          }`}>
          {/* Resume Analysis Area */}
          {resumeAnalysis && (
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-[2rem] border border-indigo-200 dark:border-indigo-800/50 shadow-xl overflow-hidden flex flex-col">
              {/* ... (resume analysis content) ... */}
            </div>
          )}

          {/* Chat Area (Replaces Question Area for Company/Self modes) */}
          {(mode === 'company' || mode === 'self') ? (
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col min-h-[600px]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">AI 面试官</h4>
                    <p className="text-xs text-slate-500 font-medium">实时对话中</p>
                  </div>
                </div>
                <button
                  onClick={handleEndInterview}
                  disabled={generatingSummary || chatHistory.length === 0}
                  className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  {generatingSummary ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                  <span>{generatingSummary ? '生成报告中...' : '结束面试'}</span>
                </button>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50 dark:bg-slate-950/50" ref={scrollRef}>
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-5 ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm'
                    }`}>
                      <div className={`prose dark:prose-invert max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                        {msg.content ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          <div className="flex space-x-2 items-center h-6">
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && chatHistory.length === 0 && (
                   <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm">
                      <div className="flex space-x-2 items-center h-6 text-slate-500">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <textarea 
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitAnswer();
                      }
                    }}
                    placeholder="输入你的回答..."
                    className="w-full p-4 pr-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none font-medium text-slate-700 dark:text-slate-200 max-h-32 min-h-[60px]"
                    rows={1}
                  />
                  <button 
                    onClick={submitAnswer}
                    disabled={evaluating || loading || !userAnswer.trim()}
                    className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {evaluating || loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">按 Enter 发送，Shift + Enter 换行</p>
              </div>
            </div>
          ) : (
            // Original Question Area for Resume Mode
            content && (
            <div className={`bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col ${
              resumeAnalysis ? 'lg:col-span-2' : ''
            } min-h-[500px]`}>
              {/* ... (original content rendering) ... */}
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
            )
          )}
        </div>
        </>
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

      {/* Summary Modal */}
      {showSummary && summaryData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600">
                  <FileUser size={20} />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white">面试总结报告</h4>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => window.print()}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
                  title="打印/导出PDF"
                >
                  <Save size={20} />
                </button>
                <button 
                  onClick={() => setShowSummary(false)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-8 print:p-0">
              <div className="mb-8 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl font-bold text-indigo-600 mb-2">{summaryData.score}</div>
                  <div className="text-sm text-slate-500 font-medium">综合评分</div>
                </div>
              </div>
              
              <div className="space-y-8">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                    <Sparkles size={20} className="mr-2 text-indigo-500" />
                    面试总结
                  </h3>
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{summaryData.summary}</ReactMarkdown>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                    <AlertCircle size={20} className="mr-2 text-red-500" />
                    薄弱点分析
                  </h3>
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{summaryData.weaknesses}</ReactMarkdown>
                  </div>
                </div>

                {summaryData.saved_wrong_answers > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 flex items-center text-green-700 dark:text-green-400">
                    <CheckCircle size={20} className="mr-2" />
                    <span>已自动将 {summaryData.saved_wrong_answers} 道错题存入薄弱点强化模块</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interview;
