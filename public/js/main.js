document.addEventListener('DOMContentLoaded', () => {
  // 页面视图元素
  const articlesListView = document.getElementById('articles-list-view');
  const articleDetailView = document.getElementById('article-detail-view');
  
  // 文章列表元素
  const articlesListEl = document.getElementById('articles-list');
  const noArticlesEl = document.querySelector('.no-articles');
  
  // 文章详情元素
  const articleDateEl = document.getElementById('article-date');
  const articleTitleEl = document.getElementById('article-title');
  const articleContentEl = document.getElementById('article-content');
  const pdfDownloadEl = document.getElementById('pdf-download');
  const mp3DownloadEl = document.getElementById('mp3-download');
  const audioPlayerEl = document.getElementById('audio-player');
  const backToListEl = document.getElementById('back-to-list');
  
  // 控制元素
  const generateButtonEl = document.getElementById('generate-button');
  const loadingEl = document.getElementById('loading');
  const errorMessageEl = document.getElementById('error-message');

  // 当前文章
  let currentArticles = [];

  // 获取文章列表
  async function getArticlesList() {
    try {
      showLoading(true);
      hideError();
      
      const response = await fetch('/api/articles');
      
      if (!response.ok) {
        throw new Error('获取文章列表失败');
      }
      
      const articles = await response.json();
      currentArticles = articles;
      
      if (articles.length === 0) {
        showNoArticles();
      } else {
        hideNoArticles();
        displayArticlesList(articles);
      }
    } catch (error) {
      console.error('获取文章列表失败:', error);
      showError('获取文章列表失败，请稍后再试。');
      showNoArticles();
    } finally {
      hideLoading();
    }
  }

  // 获取指定日期的文章
  async function getArticle(date) {
    try {
      showLoading(true);
      hideError();
      
      const response = await fetch(`/api/article/${date}`);
      
      if (!response.ok) {
        throw new Error('获取文章失败');
      }
      
      const data = await response.json();
      displayArticleDetail(data);
    } catch (error) {
      console.error('获取文章失败:', error);
      showError('获取文章失败，请稍后再试。');
    } finally {
      hideLoading();
    }
  }

  // 生成新文章
  async function generateNewArticle() {
    try {
      showLoading(true);
      hideError();
      
      // 获取用户输入的主题
      const topicInput = document.getElementById('topic-input');
      const topic = topicInput.value.trim();
      
      const response = await fetch('/api/generate-today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ topic: topic || null }) // 如果为空，传递null
      });
      
      if (!response.ok) {
        throw new Error('生成文章失败');
      }
      
      const data = await response.json();
      
      // 更新文章列表
      await getArticlesList();
      
      // 显示新生成的文章
      showArticleDetail(data.date);
      
      // 清空主题输入框
      topicInput.value = '';
    } catch (error) {
      console.error('生成文章失败:', error);
      showError('生成文章失败，请检查API密钥并稍后再试。');
    } finally {
      hideLoading();
    }
  }

  // 显示文章列表
  function displayArticlesList(articles) {
    articlesListEl.innerHTML = '';
    
    articles.forEach(article => {
      const articleItem = document.createElement('div');
      articleItem.className = 'article-item';
      
      // 格式化日期
      const dateObj = new Date(article.date);
      const formattedDate = dateObj.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // 创建小标题文本
      let subtitlesText = '';
      if (article.subtitles && article.subtitles.length > 0) {
        subtitlesText = article.subtitles.join(' | ');
      }
      
      articleItem.innerHTML = `
        <div class="article-info" data-date="${article.date}">
          <h3>${article.title}</h3>
          <div class="article-meta">
            <div class="article-date">${formattedDate}</div>
            ${article.topic ? `<div class="article-topic">主题: ${article.topic}</div>` : ''}
          </div>
          ${subtitlesText ? `<div class="article-subtitles">${subtitlesText}</div>` : ''}
        </div>
        <div class="article-actions">
          <a href="${article.pdfUrl}" class="btn btn-primary btn-small" target="_blank">
            <i class="fas fa-file-pdf"></i> PDF
          </a>
          <a href="${article.audioUrl}" class="btn btn-secondary btn-small" target="_blank">
            <i class="fas fa-file-audio"></i> MP3
          </a>
        </div>
      `;
      
      // 添加点击事件
      const articleInfo = articleItem.querySelector('.article-info');
      articleInfo.addEventListener('click', () => {
        showArticleDetail(article.date);
      });
      
      articlesListEl.appendChild(articleItem);
    });
  }

  // 显示文章详情
  function displayArticleDetail(data) {
    // 切换视图
    articlesListView.classList.add('hidden');
    articleDetailView.classList.remove('hidden');
    
    // 设置日期和主题
    const dateObj = new Date(data.date);
    const formattedDate = dateObj.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    let dateText = formattedDate;
    if (data.topic) {
      dateText += ` · 主题: ${data.topic}`;
    }
    
    articleDateEl.textContent = dateText;
    
    // 设置标题
    articleTitleEl.textContent = data.title;
    
    // 处理Markdown内容，移除主标题（因为我们已经使用articleTitleEl显示了）
    let processedContent = data.article.content;
    const titleMatch = processedContent.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      // 去除Markdown中的主标题行
      processedContent = processedContent.replace(/^#\s+(.+)$/m, '');
    }
    
    // 设置内容（Markdown格式）
    articleContentEl.innerHTML = marked.parse(processedContent);
    
    // 设置PDF下载链接
    pdfDownloadEl.href = data.pdfUrl;
    
    // 设置音频播放器和下载链接
    audioPlayerEl.src = data.audioUrl;
    mp3DownloadEl.href = data.audioUrl;
  }

  // 查看文章详情
  function showArticleDetail(date) {
    getArticle(date);
  }

  // 显示"没有文章"提示
  function showNoArticles() {
    noArticlesEl.classList.remove('hidden');
  }

  // 隐藏"没有文章"提示
  function hideNoArticles() {
    noArticlesEl.classList.add('hidden');
  }

  // 显示加载状态
  function showLoading(show = true) {
    if (show) {
      loadingEl.classList.remove('hidden');
      generateButtonEl.disabled = true;
    } else {
      loadingEl.classList.add('hidden');
      generateButtonEl.disabled = false;
    }
  }

  // 隐藏加载状态
  function hideLoading() {
    showLoading(false);
  }

  // 显示错误信息
  function showError(message) {
    errorMessageEl.textContent = message;
    errorMessageEl.classList.remove('hidden');
  }

  // 隐藏错误信息
  function hideError() {
    errorMessageEl.classList.add('hidden');
  }

  // 返回文章列表
  function backToList() {
    articleDetailView.classList.add('hidden');
    articlesListView.classList.remove('hidden');
  }

  // 事件监听
  generateButtonEl.addEventListener('click', generateNewArticle);
  backToListEl.addEventListener('click', backToList);

  // 初始化 - 加载文章列表
  getArticlesList();
}); 