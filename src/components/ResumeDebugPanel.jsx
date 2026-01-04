// 在 Interview.jsx 中添加一个调试工具条，可以快速测试简历上传
// 将以下代码添加到 Interview 组件的 render 部分

export const ResumeDebugPanel = ({ onTestClick }) => {
  const [debugLogs, setDebugLogs] = React.useState([]);

  const addLog = (msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, { msg, type, timestamp }]);
  };

  const handleTestResume = async () => {
    addLog('开始测试简历上传...', 'info');
    
    // 创建一个简单的测试简历
    const sampleResume = `
个人信息
姓名：张三
电话：13800138000
邮箱：zhangsan@example.com

教育背景
学校：北京大学
专业：计算机科学与技术
学位：学士学位
毕业年份：2020年

工作经历
公司：字节跳动
职位：高级工程师
时间：2020年-2024年
工作内容：
- 负责后端系统架构设计
- 参与大数据处理平台开发
- 带领小团队完成多个项目

技能
编程语言：Python, Java, Go, JavaScript
数据库：MySQL, PostgreSQL, MongoDB, Redis
框架：FastAPI, Spring Boot, React
    `;

    try {
      const blob = new Blob([sampleResume], { type: 'text/plain' });
      const file = new File([blob], 'test_resume.txt', { type: 'text/plain' });

      // 直接调用 onTestClick 传递文件
      onTestClick(file);
      addLog('✅ 测试文件已准备，开始上传...', 'success');
    } catch (error) {
      addLog(`❌ 测试失败: ${error.message}`, 'error');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm font-mono text-gray-200 z-50">
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
        <h3 className="font-bold text-blue-400">🔧 简历调试面板</h3>
        <button
          onClick={handleTestResume}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
        >
          测试上传
        </button>
      </div>
      
      <div className="overflow-y-auto h-64 space-y-1">
        {debugLogs.length === 0 ? (
          <div className="text-gray-500">等待日志...</div>
        ) : (
          debugLogs.map((log, idx) => (
            <div
              key={idx}
              className={`text-xs ${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'success' ? 'text-green-400' :
                'text-gray-300'
              }`}
            >
              <span className="text-gray-500">[{log.timestamp}]</span> {log.msg}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
