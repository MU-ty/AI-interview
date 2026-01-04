import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010';

const Forum = () => {
  const [posts, setPosts] = useState([]);
  const [currentPost, setCurrentPost] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showPostDetail, setShowPostDetail] = useState(false);
  
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: ''
  });
  
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  const categories = ['技术讨论', '面试经验', '学习资料', '求职心得', '其他'];

  useEffect(() => {
    loadPosts();
  }, [currentPage, selectedCategory]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE_URL}/forum/posts/?page=${currentPage}&page_size=10`;
      if (selectedCategory) {
        url += `&category=${encodeURIComponent(selectedCategory)}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.code === 200) {
        setPosts(data.data.posts || []);
        const total = data.data.total || 0;
        setTotalPages(Math.ceil(total / 10) || 1);
      }
    } catch (error) {
      console.error('加载帖子失败:', error);
      alert('加载帖子失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPostDetail = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.code === 200) {
        setCurrentPost(data.data);
        setShowPostDetail(true);
      }
    } catch (error) {
      console.error('加载帖子详情失败:', error);
      alert('加载失败: ' + error.message);
    }
  };

  const createPost = async () => {
    if (!newPost.title || !newPost.content) {
      alert('请填写标题和内容');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/forum/posts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPost)
      });
      const data = await response.json();
      
      if (data.code === 200) {
        alert('发布成功');
        setNewPost({ title: '', content: '', category: '' });
        setShowCreatePost(false);
        loadPosts();
      } else {
        alert(`发布失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('发布帖子失败:', error);
      alert('发布失败: ' + error.message);
    }
  };

  const createReply = async (postId) => {
    if (!replyContent) {
      alert('请填写回复内容');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: replyContent })
      });
      const data = await response.json();
      
      if (data.code === 200) {
        alert('回复成功');
        setReplyContent('');
        loadPostDetail(postId);
      } else {
        alert(`回复失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('回复失败:', error);
      alert('回复失败: ' + error.message);
    }
  };

  const likePost = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('请先登录');
        return;
      }
      
      console.log(`[Like] 正在为帖子 ${postId} 点赞...`);
      const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`[Like] 响应状态: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Like] HTTP错误: ${response.status} ${response.statusText}`, errorText);
        alert(`点赞失败: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      console.log(`[Like] 返回数据:`, data);
      
      if (data.code === 200 && data.data) {
        const newLikeCount = data.data.like_count;
        console.log(`[Like] 更新点赞数: ${newLikeCount}`);
        
        // 局部更新点赞数，避免全量刷新
        if (showPostDetail && currentPost?.id === postId) {
          setCurrentPost(prev => ({
            ...prev,
            like_count: newLikeCount
          }));
        }
        
        // 同时更新列表中的数据
        setPosts(prevPosts => prevPosts.map(post => 
          post.id === postId ? { ...post, like_count: newLikeCount } : post
        ));
      } else {
        console.error(`[Like] 返回数据格式错误:`, data);
        alert(`点赞失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('[Like] 网络错误:', error);
      alert(`点赞失败: ${error.message}`);
    }
  };

  const updatePost = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: editContent })
      });
      const data = await response.json();
      
      if (data.code === 200) {
        alert('修改成功');
        setIsEditing(false);
        loadPostDetail(postId);
      } else {
        alert(`修改失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('修改失败:', error);
      alert('修改失败: ' + error.message);
    }
  };

  const deletePost = async (postId) => {
    if (!confirm('确定要删除这个帖子吗？')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.code === 200) {
        alert('删除成功');
        setShowPostDetail(false);
        setCurrentPost(null);
        loadPosts();
      } else {
        alert(`删除失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败: ' + error.message);
    }
  };

  const deleteReply = async (postId, replyId) => {
    if (!confirm('确定要删除这条回复吗？')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/forum/replies/${replyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.code === 200) {
        alert('删除成功');
        loadPostDetail(postId);
      } else {
        alert(`删除失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <style>{`
        .markdown-content h1, .markdown-content h2, .markdown-content h3 { margin-top: 1em; margin-bottom: 0.5em; }
        .markdown-content p { margin-bottom: 1em; line-height: 1.6; }
        .markdown-content ul, .markdown-content ol { margin-bottom: 1em; padding-left: 2em; }
        .markdown-content code { background-color: #eee; padding: 2px 4px; borderRadius: 4px; font-family: monospace; }
        .markdown-content pre { background-color: #2d2d2d; color: #ccc; padding: 15px; borderRadius: 4px; overflow-x: auto; margin-bottom: 1em; }
        .markdown-content pre code { background-color: transparent; padding: 0; color: inherit; }
        .markdown-content blockquote { border-left: 4px solid #ddd; padding-left: 1em; color: #666; margin-bottom: 1em; }
        .markdown-content table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
        .markdown-content th, .markdown-content td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .markdown-content th { background-color: #f2f2f2; }
      `}</style>
      <h1 style={{ marginBottom: '20px' }}>💬 讨论论坛</h1>
      
      {/* 顶部操作栏 */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={() => setShowCreatePost(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          + 发布新帖
        </button>
        
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}
        >
          <option value="">全部分类</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* 创建新帖对话框 */}
      {showCreatePost && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2>发布新帖</h2>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>标题</label>
              <input
                type="text"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
                placeholder="请输入标题"
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>分类</label>
              <select
                value={newPost.category}
                onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              >
                <option value="">选择分类（可选）</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>内容</label>
              <textarea
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  minHeight: '200px',
                  resize: 'vertical'
                }}
                placeholder="请输入内容"
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreatePost(false);
                  setNewPost({ title: '', content: '', category: '' });
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ccc',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={createPost}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                发布
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 帖子详情对话框 */}
      {showPostDetail && currentPost && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>{currentPost.title}</h2>
                <button
                  onClick={() => {
                    setShowPostDetail(false);
                    setCurrentPost(null);
                    setReplyContent('');
                  }}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#ccc',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  关闭
                </button>
              </div>
              
              <div style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>
                {currentPost.category && <span style={{ marginRight: '10px' }}>分类: {currentPost.category}</span>}
                <span style={{ marginRight: '10px' }}>作者: {currentPost.author?.username || '未知'}</span>
                <span>{formatDate(currentPost.created_at)}</span>
              </div>
              
              {isEditing ? (
                <div style={{ marginTop: '15px' }}>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      minHeight: '200px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => updatePost(currentPost.id)}
                      style={{
                        padding: '5px 15px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      style={{
                        padding: '5px 15px',
                        backgroundColor: '#ccc',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  marginTop: '15px', 
                  padding: '15px', 
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  overflowX: 'auto'
                }}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({node, ...props}) => <h1 style={{marginTop: '1em', marginBottom: '0.5em'}} {...props} />,
                      h2: ({node, ...props}) => <h2 style={{marginTop: '1em', marginBottom: '0.5em'}} {...props} />,
                      h3: ({node, ...props}) => <h3 style={{marginTop: '1em', marginBottom: '0.5em'}} {...props} />,
                      p: ({node, ...props}) => <p style={{marginBottom: '1em', lineHeight: '1.6'}} {...props} />,
                      code: ({node, inline, ...props}) => {
                        if (inline) {
                          return <code style={{backgroundColor: '#eee', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace'}} {...props} />
                        }
                        return <code {...props} />
                      },
                      pre: ({node, ...props}) => <pre style={{backgroundColor: '#2d2d2d', color: '#ccc', padding: '15px', borderRadius: '4px', overflowX: 'auto', marginBottom: '1em'}} {...props} />,
                      blockquote: ({node, ...props}) => <blockquote style={{borderLeft: '4px solid #ddd', paddingLeft: '1em', color: '#666', marginBottom: '1em'}} {...props} />
                    }}
                  >
                    {currentPost.content}
                  </ReactMarkdown>
                </div>
              )}
              
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={() => likePost(currentPost.id)}
                  style={{
                    padding: '5px 15px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  👍 点赞 ({currentPost.like_count || 0})
                </button>
                
                {currentPost.can_delete && (
                  <>
                    <button
                      onClick={() => {
                        setEditContent(currentPost.content);
                        setIsEditing(true);
                      }}
                      style={{
                        padding: '5px 15px',
                        backgroundColor: '#FF9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => deletePost(currentPost.id)}
                      style={{
                        padding: '5px 15px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      删除
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 回复列表 */}
            <div style={{ marginTop: '30px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
              <h3 style={{ marginBottom: '15px' }}>回复 ({currentPost.replies?.length || 0})</h3>
              
              {currentPost.replies && currentPost.replies.map(reply => (
                <div key={reply.id} style={{
                  padding: '15px',
                  marginBottom: '10px',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '4px'
                }}>
                  <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '10px' }}>{reply.author?.username || '未知'}</span>
                    <span>{formatDate(reply.created_at)}</span>
                    {reply.can_delete && (
                      <button
                        onClick={() => deleteReply(currentPost.id, reply.id)}
                        style={{
                          marginLeft: '10px',
                          padding: '2px 8px',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        删除
                      </button>
                    )}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 style={{marginTop: '1em', marginBottom: '0.5em'}} {...props} />,
                        h2: ({node, ...props}) => <h2 style={{marginTop: '1em', marginBottom: '0.5em'}} {...props} />,
                        h3: ({node, ...props}) => <h3 style={{marginTop: '1em', marginBottom: '0.5em'}} {...props} />,
                        p: ({node, ...props}) => <p style={{marginBottom: '1em', lineHeight: '1.6'}} {...props} />,
                        code: ({node, inline, ...props}) => {
                          if (inline) {
                            return <code style={{backgroundColor: '#eee', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace'}} {...props} />
                          }
                          return <code {...props} />
                        },
                        pre: ({node, ...props}) => <pre style={{backgroundColor: '#2d2d2d', color: '#ccc', padding: '15px', borderRadius: '4px', overflowX: 'auto', marginBottom: '1em'}} {...props} />,
                        blockquote: ({node, ...props}) => <blockquote style={{borderLeft: '4px solid #ddd', paddingLeft: '1em', color: '#666', marginBottom: '1em'}} {...props} />
                      }}
                    >
                      {reply.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              
              {/* 回复输入框 */}
              <div style={{ marginTop: '20px' }}>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="写下你的回复..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                />
                <button
                  onClick={() => createReply(currentPost.id)}
                  style={{
                    marginTop: '10px',
                    padding: '8px 20px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  发表回复
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 帖子列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>加载中...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          暂无帖子，快来发布第一个吧！
        </div>
      ) : (
        <div>
          {posts.map(post => (
            <div
              key={post.id}
              onClick={() => loadPostDetail(post.id)}
              style={{
                padding: '20px',
                marginBottom: '15px',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '10px', color: '#333' }}>{post.title}</h3>
                  <div style={{ color: '#666', fontSize: '14px' }}>
                    {post.category && <span style={{ 
                      display: 'inline-block',
                      padding: '2px 8px',
                      backgroundColor: '#e3f2fd',
                      borderRadius: '3px',
                      marginRight: '10px',
                      fontSize: '12px'
                    }}>{post.category}</span>}
                    <span style={{ marginRight: '10px' }}>作者: {post.author?.username || '未知'}</span>
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                  <div style={{ 
                    marginTop: '10px',
                    color: '#999',
                    fontSize: '14px',
                    display: 'flex',
                    gap: '15px'
                  }}>
                    <span>👍 {post.like_count || 0}</span>
                    <span>💬 {post.reply_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* 分页 */}
          {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '10px',
              marginTop: '20px'
            }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentPage === 1 ? '#ccc' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                上一页
              </button>
              <span style={{ padding: '8px 16px', lineHeight: '1.5' }}>
                第 {currentPage} / {totalPages} 页
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentPage === totalPages ? '#ccc' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                下一页
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Forum;
