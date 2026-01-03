# AI 面试系统 - 前端界面

这是一个基于 React + Vite + Tailwind CSS 构建的现代面试系统前端界面。

## 功能特性

- **AI 面试生成**：支持公司题库、自选知识点、简历定制等多种模式，支持流式输出。
- **知识库管理**：支持文档上传、解析入库以及基于向量检索的知识问答。
- **薄弱点分析**：自动同步错题记录，提供智能化的知识点掌握情况分析。
- **响应式设计**：适配不同屏幕尺寸，支持深色模式。

## 快速开始

### 1. 安装依赖

在 `frontend` 目录下运行：

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

启动后，访问 [http://localhost:5173](http://localhost:5173) 即可查看界面。

### 3. 确保后端已启动

前端默认连接到 `http://localhost:8010`。请确保后端 API 服务已在运行：

```bash
cd ..
python API/main.py
```

## 技术栈

- **框架**: React 18
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **动画**: Framer Motion
- **Markdown**: react-markdown
- **HTTP 客户端**: Fetch API (流式支持)
