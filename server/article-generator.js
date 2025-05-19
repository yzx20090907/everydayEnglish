const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { jsPDF } = require('jspdf');

// 初始化OpenAI API，支持自定义接口地址
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1'
});

// 生成文章内容
async function generateArticleContent(topic = null) {
  // 如果未指定主题，从三大主题中随机选择一个
  if (!topic) {
    const defaultTopics = ['科技', '环保', '经济'];
    topic = defaultTopics[Math.floor(Math.random() * defaultTopics.length)];
    console.log(`未指定主题，自动选择主题: ${topic}`);
  }
  
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: "你是一个专业的英语教育内容创作者，为英语学习者创建适合的阅读材料。"
      },
      {
        role: "user",
        content: `请以"${topic}"为主题，创作一篇500字左右的英语短文，适合词汇量2500左右的高中生阅读。要求：1. 使用Markdown格式；2. 文章必须有一个明确的主标题(格式为: # 标题名称)；3. 文章必须有2-3个小标题(格式为: ## 小标题名称)；4. 生词比例控制在5%-10%之间（约25-50个生词），生词定义为超出高中生2500基础词汇量的词；5. 内容要有趣且实用；6. 不要在文章最后加生词表或词汇表。`
      }
    ],
    temperature: 0.7,
    max_tokens: 1500
  });

  return response.choices[0].message.content;
}

// 生成音频文件
async function generateAudio(text, outputPath) {
  // 从markdown中提取纯文本用于音频生成
  const plainText = text.replace(/#{1,6}\s+/g, '').replace(/\*\*/g, '');
  
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: plainText,
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

// 解析Markdown文本为结构化数据
function parseMarkdown(markdown) {
  const lines = markdown.split('\n');
  let title = '';
  const subtitles = [];
  let content = markdown;
  
  // 提取主标题
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1];
  }
  
  // 提取所有小标题
  const subtitleMatches = markdown.matchAll(/^##\s+(.+)$/gm);
  for (const match of subtitleMatches) {
    subtitles.push(match[1]);
  }
  
  return {
    title,
    subtitles,
    content
  };
}

// 生成PDF文件
function generatePDF(text, outputPath) {
  const doc = new jsPDF();
  
  // 解析Markdown内容
  const parsedContent = parseMarkdown(text);
  
  // 添加主标题
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  if (parsedContent.title) {
    doc.text(parsedContent.title, 105, 20, { align: 'center' });
  } else {
    doc.text('Daily English Reading', 105, 20, { align: 'center' });
  }
  
  // 添加日期
  const today = new Date().toISOString().split('T')[0];
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${today}`, 105, 30, { align: 'center' });
  
  // 将Markdown文本转换为PDF格式
  doc.setFontSize(11);
  
  // 提取纯文章内容（不包含生词部分）
  const articleContent = extractArticleContent(text);
  
  // 处理Markdown格式
  const lines = articleContent.split('\n');
  let y = 40;
  const pageHeight = doc.internal.pageSize.height;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 跳过空行
    if (line === '') {
      y += 5;
      continue;
    }
    
    // 跳过主标题，我们已经添加过了
    if (line.match(/^#\s+/)) continue;
    
    // 处理小标题
    if (line.match(/^##\s+/)) {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      const subtitleText = line.replace(/^##\s+/, '');
      doc.text(subtitleText, 15, y);
      y += 10;
      continue;
    }
    
    // 处理普通文本
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    // 处理粗体文本并去除可能导致乱码的特殊字符
    const plainLine = line
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/[^\x00-\x7F]/g, ' '); // 替换非ASCII字符为空格
    
    // 处理列表项
    if (plainLine.match(/^[*-]\s+/)) {
      const listText = plainLine.replace(/^[*-]\s+/, '• ');
      const wrappedText = doc.splitTextToSize(listText, 180);
      
      if (y + wrappedText.length * 7 > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      
      for (let j = 0; j < wrappedText.length; j++) {
        doc.text(wrappedText[j], 20, y);
        y += 7;
      }
      continue;
    }
    
    // 普通段落
    const wrappedText = doc.splitTextToSize(plainLine, 180);
    
    if (y + wrappedText.length * 7 > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    
    for (let j = 0; j < wrappedText.length; j++) {
      doc.text(wrappedText[j], 15, y);
      y += 7;
    }
  }
  
  // 保存PDF
  doc.save(outputPath);
}

// 提取纯文章内容（不包含生词部分）
function extractArticleContent(text) {
  const lines = text.split('\n');
  const contentLines = [];
  let isVocabularySection = false;
  let foundTableHeader = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检测表示词汇表开始的多种可能性
    if (
      line.match(/^##?\s+(Vocabulary|New Words|Word List|Glossary|生词表|单词表|词汇表)/i) || 
      line.match(/^(\*\*)?生词(\*\*)?[：:]/i) ||
      line.match(/^(\*\*)?词汇(\*\*)?[：:]/i) ||
      line.match(/^\d+\.\s+\w+\s+\([a-z]+\.\)/) || // 匹配形如 "1. word (n.)" 的行
      line.match(/^[A-Z][a-z]+:/) || // 匹配形如 "Vocabulary:" 的行
      line.match(/^###?\s+Vocabulary/) || // 匹配 ### Vocabulary 格式的标题
      line.trim() === '| Word | Chinese Meaning |' || // 匹配表格的标题行
      line.match(/^\|\s*Word\s*\|\s*.*\s*\|$/) || // 更通用的表格标题行匹配
      (line.includes('|') && line.includes('--')) // 匹配表格分隔线
    ) {
      isVocabularySection = true;
      
      // 如果是表格头部，标记已找到表格
      if (line.includes('|')) {
        foundTableHeader = true;
      }
      continue;
    }
    
    // 一旦发现词汇表的表格格式，继续检测后续的表格行
    if (!isVocabularySection && line.trim().startsWith('|') && foundTableHeader) {
      isVocabularySection = true;
      continue;
    }
    
    // 如果不是生词部分，添加到内容中
    if (!isVocabularySection) {
      contentLines.push(line);
    } else if (line.trim() === '' && !foundTableHeader) {
      // 如果遇到空行，且不是在表格中，可能是词汇部分结束了
      // 但对于表格格式，我们需要继续跳过直到文件结束
      if (!lines.slice(i+1).some(l => l.includes('|'))) {
        isVocabularySection = false;
      }
    }
  }
  
  return contentLines.join('\n');
}

// 主函数：生成文章、音频和PDF
async function generateArticle(topic = null) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const articlesDir = path.join(__dirname, '../public/articles');
    
    // 确保文章目录存在
    if (!fs.existsSync(articlesDir)) {
      fs.mkdirSync(articlesDir, { recursive: true });
    }
    
    // 生成文章内容
    const articleContent = await generateArticleContent(topic);
    
    // 解析文章内容
    const parsedContent = parseMarkdown(articleContent);
    
    // 保存JSON文件
    const articleData = {
      date: today,
      title: parsedContent.title || `Article ${today}`,
      subtitles: parsedContent.subtitles,
      topic: topic || '自动选择',
      content: articleContent
    };
    
    const jsonPath = path.join(articlesDir, `${today}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(articleData, null, 2));
    
    // 生成PDF
    const pdfPath = path.join(articlesDir, `${today}.pdf`);
    generatePDF(articleContent, pdfPath);
    
    // 生成音频
    const audioPath = path.join(articlesDir, `${today}.mp3`);
    await generateAudio(articleContent, audioPath);
    
    return {
      success: true,
      article: articleData
    };
  } catch (error) {
    console.error('生成文章失败:', error);
    throw error;
  }
}

module.exports = {
  generateArticle
}; 