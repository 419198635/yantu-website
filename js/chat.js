/**
 * 沿途科技官网 - AI 咨询助手（悬浮气泡 + 对话窗口）
 */
(function () {
  'use strict';

  const API_URL = '/api/chat';       // EdgeOne Pages 云函数端点
  const STORAGE_KEY = 'yantu_chat_history';

  let history = [];
  let isLoading = false;

  /* ---- 初始化 ---- */
  function init() {
    injectHTML();
    loadHistory();
    bindEvents();
    setTimeout(() => {
      const win = document.getElementById('chatWindow');
      if (win) win.classList.add('open');
    }, 800);
  }

  /* ---- 注入 HTML ---- */
  function injectHTML() {
    const bubble = document.createElement('div');
    bubble.id = 'chatBubble';
    bubble.className = 'chat-bubble';
    bubble.innerHTML = '💬<span class="badge">1</span>';
    bubble.setAttribute('title', '在线咨询');
    document.body.appendChild(bubble);

    const win = document.createElement('div');
    win.id = 'chatWindow';
    win.className = 'chat-window';
    win.innerHTML = `
      <div class="chat-window-header">
        <div>
          <h4>沿途科技 · AI 助手</h4>
          <p>企业IT运维咨询，随时为您服务</p>
        </div>
        <button class="chat-window-close" id="chatCloseBtn" title="关闭">✕</button>
      </div>
      <div class="chat-quick-actions" id="chatQuickActions">
        <button class="chat-quick-btn" data-msg="介绍一下你们的主营业务">🏢 主营业务</button>
        <button class="chat-quick-btn" data-msg="安全运维服务具体包括哪些内容？">🔒 安全运维</button>
        <button class="chat-quick-btn" data-msg="如何联系你们获取报价方案？">📞 联系我们</button>
      </div>
      <div class="chat-messages" id="chatMessages"></div>
      <div class="chat-input-area">
        <textarea id="chatInput" placeholder="输入您的问题…" rows="1"></textarea>
        <button class="chat-send-btn" id="chatSendBtn" title="发送">➤</button>
      </div>`;
    document.body.appendChild(win);
  }

  /* ---- 事件绑定 ---- */
  function bindEvents() {
    document.getElementById('chatBubble').addEventListener('click', toggleWindow);
    document.getElementById('chatCloseBtn').addEventListener('click', toggleWindow);
    document.getElementById('chatSendBtn').addEventListener('click', sendMessage);

    const input = document.getElementById('chatInput');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    input.addEventListener('input', autoResize);

    document.getElementById('chatQuickActions').addEventListener('click', (e) => {
      const btn = e.target.closest('.chat-quick-btn');
      if (btn) sendUserMessage(btn.dataset.msg);
    });
  }

  function toggleWindow() {
    const win = document.getElementById('chatWindow');
    win.classList.toggle('open');
    const badge = document.querySelector('#chatBubble .badge');
    if (badge) badge.style.display = 'none';
  }

  /* ---- 发送消息 ---- */
  function sendMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg || isLoading) return;
    input.value = '';
    autoResize.call(input);
    sendUserMessage(msg);
  }

  function sendUserMessage(msg) {
    appendMessage('user', msg);
    history.push({ role: 'user', content: msg });
    saveHistory();
    setIsLoading(true);
    showTyping();

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: history.slice(0, -1) }),
    })
      .then(res => res.json())
      .then(data => {
        removeTyping();
        const reply = data.reply || '感谢您的咨询！如有紧急需求请联系 contact@yantu.net.cn。';
        appendMessage('bot', reply);
        history.push({ role: 'assistant', content: reply });
        saveHistory();
      })
      .catch(() => {
        removeTyping();
        appendMessage('bot', '网络异常，请稍后重试，或直接联系 contact@yantu.net.cn。');
      })
      .finally(() => setIsLoading(false));
  }

  /* ---- DOM 操作 ---- */
  function appendMessage(who, text) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'chat-msg ' + who;
    div.innerHTML = `
      <div class="chat-avatar">${who === 'bot' ? '🤖' : '🧑'}</div>
      <div class="chat-bubble-text">${escapeHTML(text).replace(/\n/g, '<br>')}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function showTyping() {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'chat-msg bot';
    div.id = 'chatTyping';
    div.innerHTML = `
      <div class="chat-avatar">🤖</div>
      <div class="chat-typing"><span></span><span></span><span></span></div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('chatTyping');
    if (el) el.remove();
  }

  function setIsLoading(v) {
    isLoading = v;
    document.getElementById('chatSendBtn').disabled = v;
  }

  function autoResize() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 80) + 'px';
  }

  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---- 历史记录 ---- */
  function saveHistory() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-20))); } catch (_) {}
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) history = JSON.parse(raw);
    } catch (_) { history = []; }

    const container = document.getElementById('chatMessages');
    if (history.length === 0) {
      appendMessage('bot', `您好！👋 欢迎咨询沿途科技。\n\n我是智能助手，可以帮您了解：\n• 企业IT全栈运维服务\n• 安全运维方案\n• 服务报价与流程\n\n请直接输入问题，或点击上方快捷按钮。`);
    } else {
      history.forEach(h => appendMessage(h.role === 'user' ? 'user' : 'bot', h.content));
    }
  }

  /* ---- 启动 ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
