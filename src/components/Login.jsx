import React, { useState } from 'react';
import { User, Lock, Mail, Loader2, LogIn, UserPlus } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010';

const Login = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: ''
  });
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/login/' : '/register/';
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.code === 200) {
        if (isLogin) {
          // 登录成功，保存 token
          localStorage.setItem('token', data.data.access_token);
          localStorage.setItem('username', data.data.username);
          onLoginSuccess(data.data.username);
        } else {
          // 注册成功，切换到登录
          alert('注册成功，请登录');
          setIsLogin(true);
        }
      } else {
        setError(data.detail || '操作失败，请重试');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('网络错误，请检查后端服务是否启动');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-10">
          <div className="text-center mb-10">
            <div className="inline-flex p-4 bg-indigo-100 dark:bg-indigo-900/40 rounded-3xl text-indigo-600 mb-6">
              <LogIn size={32} />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
              {isLogin ? '欢迎回来' : '创建账号'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              {isLogin ? '请登录您的 AI 面试系统账号' : '加入我们，开启智能面试之旅'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">用户名</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  name="username"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  placeholder="输入用户名"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">邮箱 (可选)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  placeholder="输入密码"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-sm flex items-center">
                <span className="mr-2">⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2" size={24} />
              ) : (
                isLogin ? '立即登录' : '注册账号'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center justify-center mx-auto"
            >
              {isLogin ? (
                <>
                  <UserPlus size={18} className="mr-2" />
                  没有账号？立即注册
                </>
              ) : (
                <>
                  <LogIn size={18} className="mr-2" />
                  已有账号？返回登录
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
