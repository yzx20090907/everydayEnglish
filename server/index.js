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
      // 从文件名中提取日期前缀
      const filePath = path.join(articlesDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const articleData = JSON.parse(fileContent);
      
      // 提取日期 (应该是文件名的前10个字符 YYYY-MM-DD)
      const date = file.substring(0, 10);
      const filePrefix = file.replace('.json', '');
      
      articles.push({
        date: date,
        title: articleData.title || `Article ${date}`,
        subtitles: articleData.subtitles || [],
        topic: articleData.topic || '未指定主题',
        lexile: articleData.lexile || '未指定',
        filePrefix: filePrefix,
        pdfUrl: `/articles/${filePrefix}.pdf`,
        audioUrl: `/articles/${filePrefix}.mp3`
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
  try {
    // 获取最新的文章
    const files = fs.readdirSync(articlesDir);
    if (files.length === 0) {
      return res.status(404).json({ error: '没有可用的文章' });
    }
    
    // 获取所有JSON文件
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      return res.status(404).json({ error: '没有可用的文章' });
    }
    
    // 按日期排序并获取最新的文件
    const latestFile = jsonFiles.sort((a, b) => {
      // 提取日期并比较 (前10个字符 YYYY-MM-DD)
      const dateA = a.substring(0, 10);
      const dateB = b.substring(0, 10);
      return new Date(dateB) - new Date(dateA);
    })[0];
    
    const filePrefix = latestFile.replace('.json', '');
    const date = latestFile.substring(0, 10);
    
    const articlePath = path.join(articlesDir, latestFile);
    const article = JSON.parse(fs.readFileSync(articlePath, 'utf8'));
    
    res.json({
      date: date,
      title: article.title || `Article ${date}`,
      subtitles: article.subtitles || [],
      article: article,
      filePrefix: filePrefix,
      pdfUrl: `/articles/${filePrefix}.pdf`,
      audioUrl: `/articles/${filePrefix}.mp3`
    });
  } catch (error) {
    console.error('获取最新文章失败:', error);
    res.status(500).json({ error: '获取最新文章失败' });
  }
});

// 获取指定日期的文章列表
app.get('/api/articles/:date', (req, res) => {
  try {
    const { date } = req.params;
    const files = fs.readdirSync(articlesDir);
    
    // 查找指定日期开头的文件
    const matchingFiles = files.filter(file => 
      file.startsWith(date) && file.endsWith('.json')
    );
    
    if (matchingFiles.length === 0) {
      return res.status(404).json({ error: '该日期没有文章' });
    }
    
    const articles = [];
    
    // 读取每个匹配文件的信息
    for (const file of matchingFiles) {
      const filePath = path.join(articlesDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const articleData = JSON.parse(fileContent);
      const filePrefix = file.replace('.json', '');
      
      articles.push({
        date: date,
        title: articleData.title || `Article ${date}`,
        subtitles: articleData.subtitles || [],
        topic: articleData.topic || '未指定主题',
        lexile: articleData.lexile || '未指定',
        filePrefix: filePrefix,
        pdfUrl: `/articles/${filePrefix}.pdf`,
        audioUrl: `/articles/${filePrefix}.mp3`
      });
    }
    
    // 按创建时间排序（如果有时间戳信息）
    articles.sort((a, b) => {
      // 如果文件名包含时间戳，则按照时间戳排序（最新的在前）
      const timeA = a.filePrefix.substring(11) || '';
      const timeB = b.filePrefix.substring(11) || '';
      return timeB.localeCompare(timeA);
    });
    
    res.json(articles);
  } catch (error) {
    console.error('获取文章列表失败:', error);
    res.status(500).json({ error: '获取文章列表失败' });
  }
});

// 获取指定文件前缀的文章
app.get('/api/article-by-prefix/:prefix', (req, res) => {
  try {
    const { prefix } = req.params;
    const articlePath = path.join(articlesDir, `${prefix}.json`);
    
    if (!fs.existsSync(articlePath)) {
      return res.status(404).json({ error: '文章不存在' });
    }
    
    const article = JSON.parse(fs.readFileSync(articlePath, 'utf8'));
    const date = prefix.substring(0, 10);
    
    res.json({
      date: date,
      title: article.title || `Article ${date}`,
      subtitles: article.subtitles || [],
      article: article,
      filePrefix: prefix,
      pdfUrl: `/articles/${prefix}.pdf`,
      audioUrl: `/articles/${prefix}.mp3`
    });
  } catch (error) {
    console.error('获取文章失败:', error);
    res.status(500).json({ error: '获取文章失败' });
  }
});

// 修改生成今日文章的API，返回filePrefix
app.post('/api/generate-today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { topic, lexile } = req.body; // 从请求体中获取主题和蓝思值参数
    
    const result = await generateArticle(topic, lexile);
    const filePrefix = result.filePrefix;
    
    res.json({
      success: true,
      date: today,
      title: result.article.title || `Article ${today}`,
      subtitles: result.article.subtitles || [],
      topic: result.article.topic || '自动选择',
      lexile: result.article.lexile || '未指定', // 返回文章使用的蓝思值
      article: result.article,
      filePrefix: filePrefix,
      pdfUrl: `/articles/${filePrefix}.pdf`,
      audioUrl: `/articles/${filePrefix}.mp3`
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
    // 自动生成时不指定主题和蓝思值，将随机选择主题并使用默认蓝思值
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