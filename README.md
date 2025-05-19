# 每日英语学习平台

这是一个为高中生设计的英语学习网站，通过OpenAI API每日生成一篇适合学习的英语文章。

## 特点

- 每日自动生成500字左右的英语文章
- 文章适合词汇量2500左右的高中生阅读
- 生词比例控制在5%-10%之间
- 自动生成PDF文件供下载和打印
- 自动生成MP3音频文件，帮助提升听力能力
- 简洁美观的用户界面

## 安装与使用

### 前提条件

- Node.js 14.0+
- OpenAI API密钥

### 安装

1. 克隆仓库

```bash
git clone https://github.com/yzx20090907/everydayEnglish.git
cd everyday-english
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量

复制sample.env文件并重命名为.env，然后填入你的OpenAI API密钥：

```
OPENAI_API_KEY=你的OpenAI_API密钥
OPENAI_API_BASE_URL=https://api.openai.com/v1  # 如需自定义API地址，修改此处
PORT=3000
```

### 运行

```bash
npm start
```

访问 http://localhost:3000 即可查看网站。

## 功能

- **浏览文章**：网站首页显示最新生成的文章
- **下载PDF**：可以下载文章的PDF格式，方便打印学习
- **音频学习**：可以在线听或下载MP3音频文件
- **手动生成**：点击"生成新文章"按钮可以立即生成新的文章

## 定时任务

系统设置了定时任务，每天早上6点会自动生成新的文章。你也可以随时手动点击"生成新文章"按钮来生成。

## 技术栈

- 前端：HTML, CSS, JavaScript
- 后端：Node.js, Express
- API：OpenAI API (GPT-3.5和TTS)
- PDF生成：jsPDF
- 定时任务：node-schedule 