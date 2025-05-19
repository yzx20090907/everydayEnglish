require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const schedule = require('node-schedule');
const { generateArticle } = require('./article-generator');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 确保文章目录存在
const articlesDir = path.join(__dirname, '../public/articles');
if (!fs.existsSync(articlesDir)) {
  fs.mkdirSync(articlesDir, { recursive: true });
}

// 获取所有文章列表
app.get('/api/articles', (req, res) => {
  try {
    const files = fs.readdirSync(articlesDir);
    const articles = [];
    
    // 获取所有JSON文件
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    // 读取每个文件的基本信息
    for (const file of jsonFiles) {
      const date = file.replace('.json', '');
      const filePath = path.join(articlesDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const articleData = JSON.parse(fileContent);
      
      articles.push({
        date: date,
        title: articleData.title || `Article ${date}`,
        subtitles: articleData.subtitles || [],
        pdfUrl: `/articles/${date}.pdf`,
        audioUrl: `/articles/${date}.mp3`
      });
    }
    
    // 按日期排序（最新的在前）
    articles.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json(articles);
  } catch (error) {
    console.error('获取文章列表失败:', error);
    res.status(500).json({ error: '获取文章列表失败' });
  }
});

// 路由
app.get('/api/latest-article', (req, res) => {
  // 获取最新的文章
  const files = fs.readdirSync(articlesDir);
  if (files.length === 0) {
    return res.status(404).json({ error: '没有可用的文章' });
  }
  
  // 获取最新日期的文件
  const latestDate = files
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''))
    .sort()
    .pop();
  
  if (!latestDate) {
    return res.status(404).json({ error: '没有可用的文章' });
  }
  
  const articlePath = path.join(articlesDir, `${latestDate}.json`);
  const article = JSON.parse(fs.readFileSync(articlePath, 'utf8'));
  
  res.json({
    date: latestDate,
    title: article.title || `Article ${latestDate}`,
    subtitles: article.subtitles || [],
    article: article,
    pdfUrl: `/articles/${latestDate}.pdf`,
    audioUrl: `/articles/${latestDate}.mp3`
  });
});

// 获取指定日期的文章
app.get('/api/article/:date', (req, res) => {
  try {
    const { date } = req.params;
    const articlePath = path.join(articlesDir, `${date}.json`);
    
    if (!fs.existsSync(articlePath)) {
      return res.status(404).json({ error: '文章不存在' });
    }
    
    const article = JSON.parse(fs.readFileSync(articlePath, 'utf8'));
    
    res.json({
      date: date,
      title: article.title || `Article ${date}`,
      subtitles: article.subtitles || [],
      article: article,
      pdfUrl: `/articles/${date}.pdf`,
      audioUrl: `/articles/${date}.mp3`
    });
  } catch (error) {
    console.error('获取文章失败:', error);
    res.status(500).json({ error: '获取文章失败' });
  }
});

// 生成今日文章的API
app.post('/api/generate-today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { topic } = req.body; // 从请求体中获取主题参数
    
    const result = await generateArticle(topic);
    
    res.json({
      success: true,
      date: today,
      title: result.article.title || `Article ${today}`,
      subtitles: result.article.subtitles || [],
      topic: result.article.topic || '自动选择',
      article: result.article,
      pdfUrl: `/articles/${today}.pdf`,
      audioUrl: `/articles/${today}.mp3`
    });
  } catch (error) {
    console.error('生成文章失败:', error);
    res.status(500).json({ error: '生成文章失败', details: error.message });
  }
});

// 每天自动生成文章的定时任务
// 每天早上6点生成新文章
const dailyJob = schedule.scheduleJob('0 6 * * *', async () => {
  try {
    console.log('开始生成每日文章...');
    // 自动生成时不指定主题，将随机选择
    await generateArticle();
    console.log('每日文章生成完成');
  } catch (error) {
    console.error('自动生成文章失败:', error);
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
}); 