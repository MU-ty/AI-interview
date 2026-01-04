import React, { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Phone, MapPin, FileText, Upload, Save, Camera,
  Award, Code, Briefcase, Lightbulb, Edit2, X, Check, Loader2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010';

const UserProfile = ({ username }) => {
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
        alert('✅ 个人信息已保存');
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
      const response = await fetch(`${API_BASE_URL}/api/user/profile/upload-avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.code === 200) {
        // 更新本地档案数据
        setProfile(prev => ({
          ...prev,
          avatar_url: data.data.avatar_url
        }));
        alert('✅ 头像上传成功');
        // 刷新头像以显示更新
        setTimeout(fetchProfile, 500);
      }
    } catch (error) {
      console.error('上传头像失败:', error);
      alert('❌ 上传头像失败');
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
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const avatarUrl = profile?.avatar_url
    ? `${API_BASE_URL}${profile.avatar_url}?t=${Date.now()}`
    : '/default-avatar.png';

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            个人档案
          </h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              <Edit2 className="w-4 h-4" />
              编辑
            </button>
          )}
        </div>

        {/* 头像和基本信息卡片 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* 头像 */}
            <div className="relative">
              <img
                src={avatarUrl}
                alt={profile?.username || 'Avatar'}
                className="w-32 h-32 rounded-full border-4 border-blue-500 object-cover"
              />
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition disabled:opacity-50"
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
                    <label className="text-sm text-gray-400">用户名</label>
                    <input
                      type="text"
                      value={editData.username}
                      onChange={(e) => handleEditChange('username', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">学历</label>
                      <input
                        type="text"
                        value={editData.education}
                        onChange={(e) => handleEditChange('education', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">专业</label>
                      <input
                        type="text"
                        value={editData.major}
                        onChange={(e) => handleEditChange('major', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">工作年限</label>
                    <input
                      type="number"
                      min="0"
                      value={editData.work_years}
                      onChange={(e) => handleEditChange('work_years', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold">{profile?.username || '未设置'}</h2>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span>{profile?.education || '未设置'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-green-400" />
                      <span>{profile?.major || '未设置'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-purple-400" />
                      <span>{profile?.work_years || 0} 年经验</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 联系方式 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            联系方式
          </h3>
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">邮箱</label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => handleEditChange('email', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">电话</label>
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => handleEditChange('phone', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400">城市</label>
                <input
                  type="text"
                  value={editData.location}
                  onChange={(e) => handleEditChange('location', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">个人简介</label>
                <textarea
                  value={editData.bio}
                  onChange={(e) => handleEditChange('bio', e.target.value)}
                  rows="4"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="请输入个人简介..."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-400" />
                <span>{profile?.email || '未设置'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-green-400" />
                <span>{profile?.phone || '未设置'}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-purple-400" />
                <span>{profile?.location || '未设置'}</span>
              </div>
              {profile?.bio && (
                <div className="mt-4 p-3 bg-gray-700 rounded">
                  <p className="text-sm text-gray-300">{profile.bio}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 技能评分 */}
        {profile?.technical_score > 0 || profile?.experience_score > 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              能力评分
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">
                  {profile?.overall_score || 0}
                </div>
                <p className="text-gray-400">总体评分</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">
                  {profile?.technical_score || 0}
                </div>
                <p className="text-gray-400">技术评分</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">
                  {profile?.experience_score || 0}
                </div>
                <p className="text-gray-400">经验评分</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* 技能和项目 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* 技能 */}
          {profile?.technical_skills && profile.technical_skills.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-green-400" />
                技术技能
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.technical_skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-green-900 text-green-200 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 改进建议 */}
          {profile?.improvement_suggestions && profile.improvement_suggestions.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                改进建议
              </h3>
              <ul className="space-y-2">
                {profile.improvement_suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">•</span>
                    <span className="text-sm text-gray-300">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 项目经验 */}
        {profile?.project_experience && profile.project_experience.projects && profile.project_experience.projects.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-400" />
              项目经验
            </h3>
            <div className="space-y-4">
              {profile.project_experience.projects.map((project, idx) => (
                <div key={idx} className="p-4 bg-gray-700 rounded border border-gray-600">
                  <h4 className="font-bold text-blue-300">{project.name || `项目 ${idx + 1}`}</h4>
                  {project.description && (
                    <p className="text-sm text-gray-300 mt-2">{project.description}</p>
                  )}
                  {project.tech_stack && (
                    <p className="text-sm text-gray-400 mt-2">
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
              className="flex items-center gap-2 px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              <X className="w-4 h-4" />
              取消
            </button>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
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
