import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Loader2, Building2, BookOpen, FileUser, Sparkles, 
  Upload, CheckCircle, Save, AlertCircle, BrainCircuit, Eye, X,
  Mic, MicOff, Volume2, VolumeX, SkipForward, RotateCcw, Play
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010';

const InterviewV2 = ({ prefillKeywords, username }) => {
  const [interviewMode, setInterviewMode] = useState(prefillKeywords ? 'self' : 'company');
  
  // 面试状态
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 语音相关状态
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [enableAudio, setEnableAudio] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [answers, setAnswers] = useState([]);
  
  // 面试配置
  const [companyName, setCompanyName] = useState('阿里巴巴');
  const [position, setPosition] = useState('Java后端开发');
  const [keywords, setKeywords] = useState(prefillKeywords || '');
  const [difficulty, setDifficulty] = useState('中级');

  // Web Speech API 相关引用
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const transcriptRef = useRef('');
  const contentScrollRef = useRef(null);

  // 初始化 Web Speech API
  useEffect(() => {
    // 语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-CN';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        transcriptRef.current = '';
        setInterimTranscript('');
      };

      recognitionRef.current.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            transcriptRef.current += transcript + ' ';
            setUserAnswer(prev => prev + transcript + ' ');
          } else {
            interim += transcript;
          }
        }
        setInterimTranscript(interim);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('语音识别错误:', event.error);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // 语音合成
    synthRef.current = window.speechSynthesis || window.webkitSpeechSynthesis;

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const showNotification = (message, type = "info") => {
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      showNotification("您的浏览器不支持语音识别功能，请使用文字输入", "warning");
      alert("您的浏览器不支持语音识别功能\n请使用 Chrome/Edge 浏览器或直接输入文字");
      return;
    }

    if (isListening) {
      console.log('停止语音识别');
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('停止语音识别错误:', error);
      }
      setIsListening(false);
    } else {
      console.log('开始语音识别');
      transcriptRef.current = '';
      setInterimTranscript('');
      try {
        recognitionRef.current.start();
        console.log('语音识别已启动');
      } catch (error) {
        console.error('启动语音识别错误:', error);
        if (error.name === 'NotAllowedError') {
          showNotification("麦克风访问被拒绝，请在浏览器设置中允许使用麦克风", "error");
          alert("麦克风访问被拒绝\n请点击地址栏的锁图标，允许使用麦克风");
        } else {
          showNotification(`语音识别启动失败: ${error.message}`, "error");
        }
        setIsListening(false);
      }
    }
  };

  const speak = (text) => {
    if (!synthRef.current) {
      console.warn('语音合成不可用');
      showNotification("您的浏览器不支持语音播放功能", "warning");
      return;
    }

    if (!enableAudio) {
      console.log('语音播放已禁用');
      return;
    }

    if (!text || text.trim() === '') {
      console.warn('没有文本需要播放');
      return;
    }

    console.log('开始语音播放:', text.substring(0, 50));

    // 停止当前播放
    synthRef.current.cancel();
    setIsSpeaking(false);

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        console.log('语音播放开始');
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        console.log('语音播放结束');
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error('语音合成错误:', event);
        setIsSpeaking(false);
        if (event.error === 'not-allowed') {
          showNotification("语音播放被阻止，请检查浏览器权限设置", "error");
        } else {
          showNotification(`语音播放失败: ${event.error}`, "error");
        }
      };

      synthRef.current.speak(utterance);
      console.log('语音已加入播放队列');
    } catch (error) {
      console.error('语音播放异常:', error);
      setIsSpeaking(false);
      showNotification(`语音播放失败: ${error.message}`, "error");
    }
  };

  const generateQuestion = async () => {
    if (!username) {
      showNotification("请先设置用户名", "error");
      return;
    }

    if (interviewMode === 'self' && !keywords) {
      showNotification("请输入技术知识点", "error");
      return;
    }

    if (interviewMode === 'company' && (!companyName || !position)) {
      showNotification("请输入公司名称和应聘岗位", "error");
      return;
    }

    setLoading(true);
    console.log('开始生成问题...');
    console.log('请求参数:', {
      mode: interviewMode,
      keywords,
      company_name: companyName,
      position,
      difficulty,
      question_index: currentQuestionIndex,
      user_id: username
    });
    
    try {
      const requestBody = {
        mode: interviewMode,
        keywords: keywords,
        company_name: companyName,
        position: position,
        difficulty: difficulty,
        question_index: currentQuestionIndex,
        previous_answers: answers,
        user_id: username,
        history: [],
      };
      
      console.log('发送请求到:', `${API_BASE_URL}/interview/v2/generate_next_question/`);
      
      const response = await fetch(`${API_BASE_URL}/interview/v2/generate_next_question/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 错误响应:', errorText);
        throw new Error(`请求失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API 响应数据:', data);
      
      if (!data) {
        throw new Error('响应数据为空');
      }
      
      if (data.code && data.code !== 200) {
        console.error('业务错误:', data);
        showNotification(data.error || data.message || "生成问题失败", "error");
        return;
      }

      // 兼容不同的响应格式
      const question = data.question || data.data?.question;
      if (!question) {
        console.error('未找到问题字段:', data);
        throw new Error('响应中未找到问题内容');
      }

      console.log('获取到问题:', question);
      setCurrentQuestion(question);
      setInterimTranscript("");
      transcriptRef.current = "";
      setUserAnswer("");
      
      // 语音播放问题
      if (enableAudio) {
        console.log('启用语音播放');
        speak(question);
      } else {
        console.log('语音播放未启用');
      }
    } catch (error) {
      console.error("生成问题错误:", error);
      showNotification(`生成问题失败: ${error.message}`, "error");
      alert(`生成问题失败: ${error.message}\n请检查网络连接和后端服务是否正常运行`);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim()) {
      showNotification("请输入回答", "error");
      return;
    }

    setIsAnswering(true);
    try {
      const response = await fetch(`${API_BASE_URL}/interview/v2/evaluate_answer/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          question: currentQuestion,
          user_answer: userAnswer,
          difficulty: difficulty,
          mode: interviewMode,
          user_id: username,
          category: interviewMode === 'company' ? position : keywords,
        }),
      });

      const data = await response.json();
      
      if (data.code !== 200) {
        showNotification(data.error || "评估失败", "error");
        return;
      }

      const evaluation = data.evaluation;
      const feedbackText = `评分: ${evaluation.score}/100\n\n${evaluation.feedback}`;
      
      setFeedback(feedbackText);
      
      // 保存答题记录
      setAnswers([...answers, {
        question: currentQuestion,
        answer: userAnswer,
        evaluation: evaluation,
      }]);

      // 播放反馈
      if (enableAudio) {
        speak(feedbackText);
      }

    } catch (error) {
      console.error("提交答案错误:", error);
      showNotification(`提交答案失败: ${error.message}`, "error");
    } finally {
      setIsAnswering(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setUserAnswer('');
      setFeedback('');
      setInterimTranscript('');
      generateQuestion();
    } else {
      finishInterview();
    }
  };

  const finishInterview = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/interview/v2/save_interview_result/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          user_id: username,
          mode: interviewMode,
          questions_answers: answers,
          overall_feedback: `完成了${answers.length}个问题的面试`,
          score: answers.reduce((sum, ans) => sum + (ans.evaluation?.score || 0), 0) / Math.max(answers.length, 1),
        }),
      });

      const data = await response.json();
      if (data.code === 200) {
        showNotification("面试结果已保存", "success");
      }
    } catch (error) {
      console.error("保存面试结果错误:", error);
    }

    setInterviewStarted(false);
    setCurrentQuestionIndex(0);
    setAnswers([]);
  };

  const restartInterview = () => {
    setInterviewStarted(false);
    setCurrentQuestion('');
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setFeedback('');
    setAnswers([]);
    setInterimTranscript('');
  };


  // =====================
  // 主UI渲染
  // =====================

  if (!interviewStarted) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <div className="space-y-6">
          {/* 标题 */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <BrainCircuit className="w-12 h-12 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              AI交互式面试
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              一问一答的智能面试，支持语音输入和输出
            </p>
          </div>

          {/* 模式选择 */}
          <div className="space-y-4">
            <label className="text-lg font-semibold text-gray-900 dark:text-white">
              选择面试模式
            </label>
            <div className="grid grid-cols-2 gap-4">
              {/* 公司题库 */}
              <button
                onClick={() => {
                  setInterviewMode('company');
                }}
                className={`p-4 rounded-lg border-2 transition ${
                  interviewMode === 'company'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900'
                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                }`}
              >
                <Building2 className="w-8 h-8 mb-2 mx-auto text-indigo-600" />
                <p className="font-semibold text-gray-900 dark:text-white">公司题库</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">基于公司背景定制</p>
              </button>

              {/* 自选知识点 */}
              <button
                onClick={() => {
                  setInterviewMode('self');
                }}
                className={`p-4 rounded-lg border-2 transition ${
                  interviewMode === 'self'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900'
                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                }`}
              >
                <BookOpen className="w-8 h-8 mb-2 mx-auto text-indigo-600" />
                <p className="font-semibold text-gray-900 dark:text-white">自选知识点</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">针对性强化训练</p>
              </button>
            </div>
          </div>

          {/* 配置参数 */}
          <div className="space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            {interviewMode === 'company' ? (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    目标公司
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="如：阿里巴巴"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    应聘岗位
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="如：Java后端开发"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  技术知识点
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="如：React高级特性、JavaScript闭包"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                难度等级
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="初级">初级</option>
                <option value="中级">中级</option>
                <option value="高级">高级</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                问题数量
              </label>
              <input
                type="number"
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(Math.max(1, parseInt(e.target.value) || 5))}
                min="1"
                max="20"
                className="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          {/* 语音选项 */}
          <div className="flex items-center p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <input
              type="checkbox"
              id="enableAudio"
              checked={enableAudio}
              onChange={(e) => setEnableAudio(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="enableAudio" className="ml-2 text-gray-700 dark:text-gray-300">
              启用语音功能（问题播放和语音输入）
            </label>
          </div>

          {/* 开始按钮 */}
          <button
            onClick={() => {
              setInterviewStarted(true);
              setTimeout(generateQuestion, 500);
            }}
            disabled={loading || !username}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 inline mr-2 animate-spin" />
                准备中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 inline mr-2" />
                立即开始面试
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // =====================
  // 面试进行中
  // =====================

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      {/* 进度条 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            第 {currentQuestionIndex + 1} / {totalQuestions} 个问题
          </h2>
          <button
            onClick={restartInterview}
            className="text-sm px-3 py-1 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200 rounded hover:bg-red-100"
          >
            <RotateCcw className="w-4 h-4 inline mr-1" />
            重新开始
          </button>
        </div>
        <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 transition-all duration-300" 
            style={{width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`}}
          />
        </div>
      </div>

      {/* 问题展示 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">
          面试问题
        </h3>
        <p className="text-lg text-gray-900 dark:text-white leading-relaxed mb-4">
          {currentQuestion || "加载中..."}
        </p>
        
        {enableAudio && (
          <button
            onClick={() => speak(currentQuestion)}
            disabled={!currentQuestion || isSpeaking}
            className="text-sm px-3 py-1 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-200 rounded hover:bg-blue-100 disabled:bg-gray-200"
          >
            <Volume2 className="w-4 h-4 inline mr-1" />
            再次播放问题
          </button>
        )}
      </div>

      {/* 答案输入 */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              您的回答
            </h3>
            {enableAudio && (
              <button
                onClick={toggleListening}
                disabled={isAnswering}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  isListening
                    ? 'bg-red-600 text-white'
                    : 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-200 hover:bg-blue-100'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4 inline mr-1" />
                    停止录音
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 inline mr-1" />
                    开始录音
                  </>
                )}
              </button>
            )}
          </div>

          {interimTranscript && (
            <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 rounded text-sm">
              <p className="font-medium">识别中：</p>
              <p>{interimTranscript}</p>
            </div>
          )}

          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="请输入或说出您的回答..."
            className="w-full h-32 p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            onClick={submitAnswer}
            disabled={isAnswering || !userAnswer.trim()}
            className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition"
          >
            {isAnswering ? (
              <>
                <Loader2 className="w-5 h-5 inline mr-2 animate-spin" />
                评估中...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 inline mr-2" />
                提交回答
              </>
            )}
          </button>
        </div>
      </div>

      {/* 反馈显示 */}
      {feedback && (
        <div className="bg-green-50 dark:bg-green-900 rounded-lg p-6 border border-green-200 dark:border-green-700">
          <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 uppercase tracking-wide mb-3 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            评估反馈
          </h3>
          <div className="text-gray-800 dark:text-gray-200 space-y-3 whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {feedback}
            </ReactMarkdown>
          </div>

          {currentQuestionIndex < totalQuestions - 1 ? (
            <button
              onClick={nextQuestion}
              className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              <SkipForward className="w-5 h-5 inline mr-2" />
              下一个问题
            </button>
          ) : (
            <button
              onClick={finishInterview}
              className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              <Save className="w-5 h-5 inline mr-2" />
              完成面试
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default InterviewV2;
