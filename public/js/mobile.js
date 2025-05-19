// 移动端增强脚本

document.addEventListener('DOMContentLoaded', function() {
  // 检测是否为移动设备
  const isMobile = window.innerWidth <= 768;
  
  if (isMobile) {
    // 增强点击体验，消除300ms点击延迟问题
    const clickableElements = document.querySelectorAll('.btn, .article-item, #back-to-list');
    clickableElements.forEach(element => {
      element.addEventListener('touchstart', function() {
        this.classList.add('touch-active');
      }, { passive: true });
      
      element.addEventListener('touchend', function() {
        this.classList.remove('touch-active');
      }, { passive: true });
    });
    
    // 平滑滚动到顶部
    function scrollToTop() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
    
    // 在返回列表按钮点击时自动滚动到顶部
    const backToListBtn = document.getElementById('back-to-list');
    if (backToListBtn) {
      backToListBtn.addEventListener('click', function() {
        setTimeout(scrollToTop, 50);
      });
    }
    
    // 阻止双指缩放（可选，取决于是否需要这个功能）
    // document.addEventListener('gesturestart', function(e) {
    //   e.preventDefault();
    // });
    
    // 当用户点击生成按钮时自动隐藏虚拟键盘
    const generateButton = document.getElementById('generate-button');
    const topicInput = document.getElementById('topic-input');
    
    if (generateButton && topicInput) {
      generateButton.addEventListener('click', function() {
        topicInput.blur();
      });
    }
    
    // 针对iOS的兼容性修复
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // 修复iOS点击问题
      document.documentElement.style.cursor = 'pointer';
    }
  }
}); 