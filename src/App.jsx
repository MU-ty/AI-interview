import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  BrainCircuit, 
  FileText, 
  Settings,
  MessageSquare,
  History,
  ChevronRight,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import Interview from './components/Interview';
import KnowledgeBase from './components/KnowledgeBase';
import Weakness from './components/Weakness';

function App() {
  const [activeTab, setActiveTab] = useState('interview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [prefillKeywords, setPrefillKeywords] = useState('');

  const handleStartPractice = (keywords) => {
    setPrefillKeywords(keywords);
    setActiveTab('interview');
  };

  const menuItems = [
    { id: 'interview', name: 'AI 面试', icon: MessageSquare },
    { id: 'knowledge', name: '知识库管理', icon: BookOpen },
    { id: 'weakness', name: '薄弱点强化', icon: BrainCircuit },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-[#020617] text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-72' : 'w-20'
        } transition-all duration-500 ease-in-out bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-xl z-20`}
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
                AI Interview
              </h1>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center p-3.5 rounded-xl transition-all duration-200 group ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              <item.icon size={22} className={`${activeTab === item.id ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} />
              {isSidebarOpen && <span className="ml-3 font-semibold tracking-wide">{item.name}</span>}
              {isSidebarOpen && activeTab === item.id && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 m-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
              JD
            </div>
            {isSidebarOpen && (
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-bold truncate">John Doe</p>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse" />
                  <p className="text-xs text-slate-500 font-medium">Pro Member</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-indigo-100/50 dark:bg-indigo-900/10 blur-3xl rounded-full -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 -z-10 w-96 h-96 bg-purple-100/50 dark:bg-purple-900/10 blur-3xl rounded-full -ml-48 -mb-48" />

        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center px-10 justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              {menuItems.find(i => i.id === activeTab)?.name}
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              {activeTab === 'interview' && '准备好迎接你的下一次挑战了吗？'}
              {activeTab === 'knowledge' && '管理你的个人知识库，提升 AI 准确度'}
              {activeTab === 'weakness' && '针对性练习，攻克你的知识盲区'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-xs font-bold text-slate-500">
              <History size={14} className="mr-1.5" />
              上次面试: 2小时前
            </div>
            <button className="p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700">
              <Settings size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'interview' && <Interview prefillKeywords={prefillKeywords} />}
            {activeTab === 'knowledge' && <KnowledgeBase />}
            {activeTab === 'weakness' && <Weakness onStartPractice={handleStartPractice} />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
