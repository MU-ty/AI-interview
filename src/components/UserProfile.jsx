import React, { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Phone, MapPin, FileText, Upload, Save, Camera,
  Award, Code, Briefcase, Lightbulb, Edit2, X, Check, Loader2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010';

const UserProfile = ({ username, onProfileUpdate }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const [editData, setEditData] = useState({
    username: '',
    education: '',
    major: '',
    work_years: 0,
    bio: '',
    phone: '',
    email: '',
    location: ''
  });

  // 获取个人档案
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/user/profile/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.code === 200) {
        setProfile(data.data);
        // 同步更新侧边栏
        if (onProfileUpdate) {
          onProfileUpdate({
            username: data.data.username,
            avatar_url: data.data.avatar_url
          });
        }
        setEditData({
          username: data.data.username || '',
          education: data.data.education || '',
          major: data.data.major || '',
          work_years: data.data.work_years || 0,
          bio: data.data.bio || '',
          phone: data.data.phone || '',
          email: data.data.email || '',
          location: data.data.location || ''
        });
      }
    } catch (error) {
      console.error('获取个人档案失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存个人信息
  const saveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/user/profile/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      });
      const data = await response.json();
      if (data.code === 200) {
        setProfile(data.data);
        setIsEditing(false);
        
        // 更新 localStorage 中的用户名
        if (data.data.username) {
          localStorage.setItem('username', data.data.username);
        }
        
        // 同步更新侧边栏和 App.jsx 的状态
        if (onProfileUpdate) {
          onProfileUpdate({
            username: data.data.username,
            avatar_url: data.data.avatar_url
          });
        }
        
        alert('✅ 个人信息已保存，昵称已同步更新');
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('❌ 保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 上传头像
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件大小和类型
    if (file.size > 5 * 1024 * 1024) {
      alert('头像文件过大，限制 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('请先登录');
        setUploadingAvatar(false);
        return;
      }

      console.log('开始上传头像，API URL:', `${API_BASE_URL}/api/user/profile/upload-avatar`);
      
      const response = await fetch(`${API_BASE_URL}/api/user/profile/upload-avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // 不要设置 Content-Type，让浏览器自动设置 multipart/form-data
        },
        body: formData
      });

      console.log('上传响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('上传失败的响应:', errorText);
        alert(`❌ 上传失败: ${response.status} ${response.statusText}`);
        return;
      }

      const data = await response.json();
      console.log('上传结果:', data);
      
      if (data.code === 200) {
        // 更新本地档案数据
        setProfile(prev => ({
          ...prev,
          avatar_url: data.data.avatar_url
        }));
        // 同步更新侧边栏
        if (onProfileUpdate) {
          onProfileUpdate({
            avatar_url: data.data.avatar_url
          });
        }
        alert('✅ 头像上传成功');
        // 刷新头像以显示更新
        setTimeout(fetchProfile, 500);
      } else {
        alert(`❌ 上传失败: ${data.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('上传头像失败:', error);
      alert(`❌ 上传头像失败: ${error.message}`);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEditChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: field === 'work_years' ? parseInt(value) || 0 : value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const avatarUrl = profile?.avatar_url
    ? `${API_BASE_URL}${profile.avatar_url}?t=${Date.now()}`
    : '/default-avatar.png';

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            个人档案
          </h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              <Edit2 className="w-4 h-4" />
              编辑
            </button>
          )}
        </div>

        {/* 头像和基本信息卡片 */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* 头像 */}
            <div className="relative">
              <img
                src={avatarUrl}
                alt={profile?.username || 'Avatar'}
                className="w-32 h-32 rounded-full border-4 border-indigo-500 object-cover shadow-lg"
              />
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition disabled:opacity-50 shadow-lg"
                  title="更换头像"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* 基本信息 */}
            <div className="flex-1 space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">用户名</label>
                    <input
                      type="text"
                      value={editData.username}
                      onChange={(e) => handleEditChange('username', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">学历</label>
                      <input
                        type="text"
                        value={editData.education}
                        onChange={(e) => handleEditChange('education', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">专业</label>
                      <input
                        type="text"
                        value={editData.major}
                        onChange={(e) => handleEditChange('major', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">工作年限</label>
                    <input
                      type="number"
                      min="0"
                      value={editData.work_years}
                      onChange={(e) => handleEditChange('work_years', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{profile?.username || '未设置'}</h2>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{profile?.education || '未设置'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Code className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      <span>{profile?.major || '未设置'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{profile?.work_years || 0} 年经验</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 联系方式 */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            联系方式
          </h3>
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">邮箱</label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => handleEditChange('email', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">电话</label>
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => handleEditChange('phone', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">城市</label>
                <input
                  type="text"
                  value={editData.location}
                  onChange={(e) => handleEditChange('location', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">个人简介</label>
                <textarea
                  value={editData.bio}
                  onChange={(e) => handleEditChange('bio', e.target.value)}
                  rows="4"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium resize-none"
                  placeholder="请输入个人简介..."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>{profile?.email || '未设置'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                <Phone className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <span>{profile?.phone || '未设置'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>{profile?.location || '未设置'}</span>
              </div>
              {profile?.bio && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400">{profile.bio}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 技能评分 */}
        {profile?.technical_score > 0 || profile?.experience_score > 0 ? (
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-2xl p-8 border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
              <Award className="w-5 h-5 text-amber-500" />
              能力评分
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                  {profile?.overall_score || 0}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">总体评分</p>
              </div>
              <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-4xl font-bold text-violet-600 dark:text-violet-400">
                  {profile?.technical_score || 0}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">技术评分</p>
              </div>
              <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                  {profile?.experience_score || 0}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">经验评分</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* 技能和项目 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* 技能 */}
          {profile?.technical_skills && profile.technical_skills.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
                <Code className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                技术技能
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.technical_skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-sm font-medium border border-violet-200 dark:border-violet-800/50"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 改进建议 */}
          {profile?.improvement_suggestions && profile.improvement_suggestions.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                改进建议
              </h3>
              <ul className="space-y-2">
                {profile.improvement_suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                    <span className="text-amber-500 mt-1 font-bold">•</span>
                    <span className="text-sm">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 项目经验 */}
        {profile?.project_experience && profile.project_experience.projects && profile.project_experience.projects.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
              <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              项目经验
            </h3>
            <div className="space-y-4">
              {profile.project_experience.projects.map((project, idx) => (
                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-indigo-600 dark:text-indigo-400">{project.name || `项目 ${idx + 1}`}</h4>
                  {project.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{project.description}</p>
                  )}
                  {project.tech_stack && (
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                      <span className="font-semibold">技术栈:</span> {project.tech_stack}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        {isEditing && (
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition-all font-medium"
            >
              <X className="w-4 h-4" />
              取消
            </button>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none font-medium disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              保存
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
