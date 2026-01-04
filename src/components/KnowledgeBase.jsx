import React, { useState, useEffect } from 'react';
import { Upload, File, Search, Trash2, CheckCircle2, AlertCircle, Loader2, Sparkles, Eye, X, FolderOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mammoth from 'mammoth';

// API 基础 URL - 支持环境变量和默认值
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010';

const KnowledgeBase = ({ username }) => {
  const [file, setFile] = useState(null);
  const [knowledgeBaseName, setKnowledgeBaseName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // 新增：知识库列表相关状态
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [selectedKB, setSelectedKB] = useState(null);
  const [kbFiles, setKBFiles] = useState([]);
  const [loadingKBList, setLoadingKBList] = useState(false);
  
  // 新增：已上传文件预览状态
  const [showUploadedPreview, setShowUploadedPreview] = useState(false);
  const [uploadedPreviewData, setUploadedPreviewData] = useState(null);
  const [previewingFile, setPreviewingFile] = useState(null);

  // 加载知识库列表
  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  const loadKnowledgeBases = async () => {
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

  const loadKnowledgeBaseFiles = async (kbName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/knowledge_base_files/?knowlage_name=${encodeURIComponent(kbName)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.code === 200) {
        setKBFiles(data.data || []);
      }
    } catch (error) {
      console.error('加载文件列表失败:', error);
    }
  };

  const handleSelectKB = (kbName) => {
    setSelectedKB(selectedKB === kbName ? null : kbName);
    if (selectedKB !== kbName) {
      loadKnowledgeBaseFiles(kbName);
    }
  };

  const previewUploadedFile = async (kbName, fileName) => {
    setPreviewingFile(fileName);
    setShowUploadedPreview(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/knowledge_base_file_preview/?knowlage_name=${encodeURIComponent(kbName)}&filename=${encodeURIComponent(fileName)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      
      if (data.code === 200) {
        setUploadedPreviewData(data.data);
      } else {
        alert(`预览失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('预览文件失败:', error);
      alert('预览失败: ' + error.message);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      
      // If it's a text-based file, read it for preview
      if (selectedFile.type.includes('text') || selectedFile.name.endsWith('.md') || selectedFile.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreviewContent(e.target.result);
        reader.readAsText(selectedFile);
      } else if (selectedFile.name.endsWith('.docx')) {
        setIsPreviewLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
          const arrayBuffer = e.target.result;
          try {
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setPreviewContent(result.value);
          } catch (err) {
            console.error('Word preview error:', err);
            setPreviewContent('<p className="text-red-500">Word 文档解析失败</p>');
          } finally {
            setIsPreviewLoading(false);
          }
        };
        reader.readAsArrayBuffer(selectedFile);
      } else {
        setPreviewContent('');
      }
    }
  };

  const uploadFile = async () => {
    if (!file || !knowledgeBaseName) {
      alert('请输入知识库名称并选择文件');
      return;
    }
    setUploading(true);
    
    const formData = new FormData();
    formData.append('files', file);
    formData.append('knowlage_name', knowledgeBaseName);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/knowlage_upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      const data = await response.json();
      if (data.code === 200) {
        alert('上传成功');
        setFile(null);
        setKnowledgeBaseName('');
        setPreviewUrl(null);
        setPreviewContent('');
        setShowPreview(false);
        
        // 刷新知识库列表
        await loadKnowledgeBases();
        
        // 自动展开新上传的知识库
        const kbName = data.data?.knowledge_base;
        if (kbName) {
          setSelectedKB(kbName);
          // 加载该知识库的文件列表
          setTimeout(() => {
            loadKnowledgeBaseFiles(kbName);
          }, 100);
        }
      } else {
        alert(`上传失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('上传失败: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!query) {
      alert('请输入查询问题');
      return;
    }
    if (!selectedKB) {
      alert('请先选择一个知识库');
      return;
    }
    setSearching(true);
    setSearchResult(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/knowlage_chat/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          knowlage_name: selectedKB,
          user_prompt: query,
          history: '[]'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '搜索失败' }));
        throw new Error(errorData.error || '搜索失败');
      }

      // 处理 SSE 流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);  // 移除 'data: ' 前缀
            if (jsonStr) {
              try {
                const data = JSON.parse(jsonStr);
                if (data.choices && data.choices[0] && data.choices[0].delta) {
                  const content = data.choices[0].delta.content || '';
                  fullText += content;
                  // 实时更新搜索结果
                  setSearchResult({ answer: fullText });
                }
              } catch (e) {
                console.warn('解析 SSE 数据失败:', e);
              }
            }
          }
        }
      }
      
      setSearchResult({ answer: fullText || '未获得结果' });
    } catch (error) {
      console.error('Search error:', error);
      alert('搜索失败: ' + error.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700">
      {/* Upload Section */}
      <section className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10">
          <Upload size={120} />
        </div>
        
        <div className="relative">
          <h3 className="text-2xl font-bold mb-2 flex items-center text-slate-800 dark:text-white">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl mr-3 text-indigo-600">
              <Upload size={24} />
            </div>
            上传知识文档
          </h3>
          <p className="text-slate-500 mb-8 font-medium">将你的学习资料、项目文档或面经上传，构建专属 AI 知识库</p>
          
          {/* Knowledge Base Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
              知识库名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={knowledgeBaseName}
              onChange={(e) => setKnowledgeBaseName(e.target.value)}
              placeholder="请输入知识库名称，例如：Java面经、Python学习资料"
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <div className="group relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] p-12 flex flex-col items-center justify-center space-y-6 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all duration-300 cursor-pointer">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300 shadow-inner">
              <File size={40} />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{file ? file.name : '点击或拖拽文件到此处'}</p>
              <p className="text-sm text-slate-400 mt-2 font-medium">支持 PDF, TXT, Markdown, JSON (最大 20MB)</p>
            </div>
            <input 
              type="file" 
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              style={{ display: file ? 'none' : 'block' }}
            />
            
            {file && (
              <div className="flex space-x-4 pt-4 animate-in zoom-in duration-300">
                <button 
                  onClick={() => setShowPreview(true)}
                  className="px-6 py-3 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-2xl transition-colors flex items-center"
                >
                  <Eye size={18} className="mr-2" />
                  预览文件
                </button>
                <button 
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                    setPreviewContent('');
                  }}
                  className="px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                >
                  取消选择
                </button>
                <button 
                  onClick={uploadFile}
                  disabled={uploading}
                  className="px-8 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 flex items-center transform hover:-translate-y-0.5 transition-all"
                >
                  {uploading ? <Loader2 className="animate-spin mr-2" size={18} /> : <CheckCircle2 className="mr-2" size={18} />}
                  {uploading ? '正在解析文档...' : '开始解析入库'}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[80vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center space-x-3">
                <File className="text-indigo-600" size={24} />
                <h4 className="font-bold text-slate-800 dark:text-white truncate max-w-md">{file?.name}</h4>
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
                  <p className="text-slate-500 font-medium">正在解析 Word 文档...</p>
                </div>
              ) : file?.type === 'application/pdf' ? (
                <iframe src={previewUrl} className="w-full h-[60vh] rounded-xl border border-slate-200 dark:border-slate-700" />
              ) : file?.name.endsWith('.docx') ? (
                <div 
                  className="p-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 prose dark:prose-invert max-w-none word-preview"
                  dangerouslySetInnerHTML={{ __html: previewContent }}
                />
              ) : previewContent ? (
                <pre className="p-6 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap border border-slate-200 dark:border-slate-700">
                  {previewContent}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <AlertCircle size={48} className="mb-4 opacity-20" />
                  <p className="font-medium">该文件类型暂不支持直接预览</p>
                  <p className="text-xs mt-2">您可以直接点击“开始解析入库”进行处理</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Bases List Section */}
      <section className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-2xl font-bold mb-2 flex items-center text-slate-800 dark:text-white">
          <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-xl mr-3 text-green-600">
            <FolderOpen size={24} />
          </div>
          已上传的知识库
        </h3>
        <p className="text-slate-500 mb-8 font-medium">管理您创建的知识库和文档</p>
        
        {loadingKBList ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-green-500 mr-3" size={24} />
            <span className="text-slate-500">加载知识库列表...</span>
          </div>
        ) : knowledgeBases.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-2xl">
            <FolderOpen size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 font-medium">还没有上传任何知识库</p>
            <p className="text-slate-400 text-sm mt-2">上传文档后，您的知识库将显示在这里</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {knowledgeBases.map((kb) => (
              <div 
                key={kb.name}
                onClick={() => handleSelectKB(kb.name)}
                className={`p-6 rounded-2xl cursor-pointer transition-all border-2 ${
                  selectedKB === kb.name
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-green-400 dark:hover:border-green-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-lg truncate">{kb.name}</h4>
                    <p className="text-sm text-slate-500 mt-2">
                      <File size={14} className="inline mr-1" />
                      {kb.file_count} 个文件
                    </p>
                  </div>
                  {selectedKB === kb.name && (
                    <CheckCircle2 size={24} className="text-green-500 ml-2 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KB Files List */}
        {selectedKB && kbFiles.length > 0 && (
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4">
              "{selectedKB}" 中的文件
            </h4>
            <div className="space-y-2">
              {kbFiles.map((file) => (
                <div 
                  key={file.name}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <File size={18} className="text-slate-400 mr-3 flex-shrink-0" />
                    <span className="flex-1 text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <span className="text-xs text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                      {file.type}
                    </span>
                    <button
                      onClick={() => previewUploadedFile(selectedKB, file.name)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="预览文件"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Query Section */}
      <section className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-2xl font-bold mb-2 flex items-center text-slate-800 dark:text-white">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-xl mr-3 text-purple-600">
            <Search size={24} />
          </div>
          知识库检索
        </h3>
        <p className="text-slate-500 mb-8 font-medium">基于向量检索技术，从已上传的文档中精准寻找答案</p>
        
        <div className="flex space-x-4">
          <div className="flex-1 relative group">
            <input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入问题，例如：'Redis 的持久化机制有哪些？'"
              className="w-full p-5 pr-16 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all text-lg font-medium"
            />
            <button 
              onClick={handleSearch}
              disabled={searching}
              className="absolute right-3 top-3 bottom-3 px-4 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all flex items-center justify-center shadow-md disabled:opacity-50"
            >
              {searching ? <Loader2 className="animate-spin" size={22} /> : <Search size={22} />}
            </button>
          </div>
        </div>

        {searchResult && (
          <div className="mt-10 space-y-8 animate-in slide-in-from-top-4 duration-500">
            <div className="p-8 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 rounded-[2rem] border border-purple-100 dark:border-purple-900/30 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-600" />
              <h4 className="font-bold text-purple-900 dark:text-purple-300 mb-4 flex items-center uppercase tracking-wider text-sm">
                <Sparkles size={16} className="mr-2" />
                AI 深度回答
              </h4>
              <div className="prose dark:prose-invert max-w-none prose-p:text-slate-700 dark:prose-p:text-slate-200 prose-p:leading-relaxed prose-p:text-lg">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {searchResult.answer}
                </ReactMarkdown>
              </div>
            </div>
            
            {searchResult.citations && searchResult.citations.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-[0.2em] flex items-center">
                  <div className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800 mr-3" />
                  参考来源片段
                  <div className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800 ml-3" />
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResult.citations.map((cite, idx) => (
                    <div key={idx} className="p-6 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-900 transition-colors group">
                      <div className="flex justify-between items-center mb-3">
                        <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs font-bold">
                          SOURCE #{idx + 1}
                        </span>
                        <span className="text-slate-400 text-xs font-bold">匹配度: {(cite.score * 100).toFixed(1)}%</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm italic leading-relaxed line-clamp-4 group-hover:line-clamp-none transition-all">
                        "{cite.text}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Uploaded File Preview Modal */}
      {showUploadedPreview && uploadedPreviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[80vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center space-x-3">
                <File className="text-indigo-600" size={24} />
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white truncate max-w-md">{uploadedPreviewData.filename}</h4>
                  <p className="text-xs text-slate-500 mt-1">类型: {(uploadedPreviewData.filetype || 'unknown').toUpperCase()}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowUploadedPreview(false);
                  setUploadedPreviewData(null);
                }}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-8">
              {uploadedPreviewData.preview_type === 'text' || uploadedPreviewData.type === 'text' ? (
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 max-h-[calc(80vh-200px)] overflow-auto whitespace-pre-wrap break-words font-mono leading-relaxed">
                  {uploadedPreviewData.content}
                </div>
              ) : uploadedPreviewData.preview_type === 'html' || uploadedPreviewData.type === 'html' ? (
                <div 
                  className="p-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 prose dark:prose-invert max-w-none overflow-auto"
                  dangerouslySetInnerHTML={{ __html: uploadedPreviewData.content }}
                />
              ) : uploadedPreviewData.preview_type === 'pdf_text' || uploadedPreviewData.type === 'pdf_text' ? (
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 max-h-[calc(80vh-200px)] overflow-auto whitespace-pre-wrap break-words font-mono leading-relaxed">
                  {uploadedPreviewData.content}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <AlertCircle size={48} className="mb-4 opacity-20" />
                  <p className="font-medium">{uploadedPreviewData.content || '无法显示预览内容'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
