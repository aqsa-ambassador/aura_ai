/**
 * Aura AI — Frontend logic
 */

const API_BASE = "https://aqsa-aura-ai.aqsasarfraz732.workers.dev"; // Updated Worker URL
const CHAT_URL = `${API_BASE}`;
const CONVERSATIONS_URL = `${API_BASE}/api/conversations`;
const MESSAGES_URL = `${API_BASE}/api/messages`;
const IMAGE_API = "https://image.pollinations.ai/prompt/"; // free, no key needed

// ------------------------- DOM references -------------------------
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const quickButtons = document.querySelectorAll(".quick-btn");
const quickPromptsContainer = document.getElementById("quick-prompts");
const headerTitle = document.getElementById("header-title");

const authButtons = document.getElementById("auth-buttons");
const userButtonContainer = document.getElementById("user-button");
const signInBtn = document.getElementById("sign-in-btn");
const signUpBtn = document.getElementById("sign-up-btn");
const lockSignInBtn = document.getElementById("lock-sign-in-btn");
const lockSignUpBtn = document.getElementById("lock-sign-up-btn");
const authLockBanner = document.getElementById("auth-lock-banner");
const themeToggle = document.getElementById("theme-toggle");
const yearEl = document.getElementById("year");

const attachBtn = document.getElementById("attach-btn");
const fileInput = document.getElementById("file-input");
const fileChip = document.getElementById("file-chip");
const fileChipName = document.getElementById("file-chip-name");
const fileChipRemove = document.getElementById("file-chip-remove");
const micBtn = document.getElementById("mic-btn");
const voiceOutputToggle = document.getElementById("voice-output-toggle");
const imageGenBtn = document.getElementById("image-gen-btn");

const appShell = document.getElementById("app-shell");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const sidebarOpenBtn = document.getElementById("sidebar-open");
const sidebarOpenFloat = document.getElementById("sidebar-open-float");
const sidebarCloseBtn = document.getElementById("sidebar-close");
const sidebarResizeHandle = document.getElementById("sidebar-resize-handle");
const newChatBtn = document.getElementById("new-chat-btn");
const searchInput = document.getElementById("search-chats");
const conversationList = document.getElementById("conversation-list");

let isAuthenticated = false;
let isSending = false;
let isVoiceOutputEnabled = false;
let isImageMode = false;
let activeConversationId = null;
let conversations = [];
let attachedFileContent = "";

if (yearEl) yearEl.textContent = new Date().getFullYear();

// ------------------------- Theme -------------------------
(function initTheme() {
  const saved = localStorage.getItem("aura-theme");
  if (saved === "light") document.documentElement.setAttribute("data-theme", "light");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      if (isLight) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("aura-theme", "dark");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("aura-theme", "light");
      }
    });
  }
})();

// ------------------------- LocalStorage Persistence -------------------------
function saveConversationsToStorage() {
  localStorage.setItem("aura_conversations", JSON.stringify(conversations));
}

function loadConversationsFromStorage() {
  const saved = localStorage.getItem("aura_conversations");
  if (saved) {
    try {
      conversations = JSON.parse(saved);
      renderConversationList();
    } catch (e) {
      console.error("Failed to parse saved chats from localStorage", e);
    }
  }
}

// ------------------------- Sidebar: mobile open/close + desktop collapse -------------------------
function isMobile() { return window.innerWidth <= 800; }

function openSidebar() {
  if (isMobile()) {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("visible");
  } else {
    appShell.classList.remove("sidebar-collapsed");
    localStorage.setItem("aura-sidebar-collapsed", "0");
  }
}
function closeSidebar() {
  if (isMobile()) {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("visible");
  } else {
    appShell.classList.add("sidebar-collapsed");
    localStorage.setItem("aura-sidebar-collapsed", "1");
  }
}
if (sidebarOpenBtn) sidebarOpenBtn.addEventListener("click", openSidebar);
if (sidebarOpenFloat) sidebarOpenFloat.addEventListener("click", openSidebar);
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener("click", closeSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

// Restore collapsed state (desktop only) + saved width
(function initSidebarState() {
  if (!isMobile() && localStorage.getItem("aura-sidebar-collapsed") === "1") {
    appShell.classList.add("sidebar-collapsed");
  }
  const savedWidth = localStorage.getItem("aura-sidebar-width");
  if (savedWidth) document.documentElement.style.setProperty("--sidebar-width", savedWidth + "px");
})();

// Drag-to-resize sidebar
if (sidebarResizeHandle) {
  let dragging = false;
  sidebarResizeHandle.addEventListener("mousedown", (e) => {
    dragging = true;
    sidebarResizeHandle.classList.add("dragging");
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const width = Math.min(420, Math.max(200, e.clientX));
    document.documentElement.style.setProperty("--sidebar-width", width + "px");
  });
  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    sidebarResizeHandle.classList.remove("dragging");
    const current = getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width").trim();
    localStorage.setItem("aura-sidebar-width", parseInt(current, 10));
  });
}

// ------------------------- Clerk initialization -------------------------
window.addEventListener("load", async () => {
  loadConversationsFromStorage();

  try {
    if (window.Clerk) {
      await window.Clerk.load();
      updateAuthUI();
      window.Clerk.addListener(() => updateAuthUI());

      const openSignInModal = () => window.Clerk.openSignIn();
      const openSignUpModal = () => window.Clerk.openSignUp();

      if (signInBtn) signInBtn.addEventListener("click", openSignInModal);
      if (signUpBtn) signUpBtn.addEventListener("click", openSignUpModal);
      if (lockSignInBtn) lockSignInBtn.addEventListener("click", openSignInModal);
      if (lockSignUpBtn) lockSignUpBtn.addEventListener("click", openSignUpModal);
    }
  } catch (err) {
    console.error("Clerk failed to load:", err);
  }
});

async function getToken() {
  return window.Clerk?.session ? window.Clerk.session.getToken() : null;
}

function updateAuthUI() {
  const user = window.Clerk?.user;
  const wasAuthenticated = isAuthenticated;
  isAuthenticated = !!user;

  if (isAuthenticated) {
    if (authButtons) authButtons.style.display = "none";
    if (userButtonContainer) {
      userButtonContainer.style.display = "flex";
      userButtonContainer.innerHTML = "";
      window.Clerk.mountUserButton(userButtonContainer, { afterSignOutUrl: window.location.href });
    }
    if (authLockBanner) authLockBanner.classList.remove("visible");
    setInputEnabled(true);
    if (!wasAuthenticated) loadConversations();
  } else {
    if (authButtons) authButtons.style.display = "flex";
    if (userButtonContainer) {
      userButtonContainer.style.display = "none";
      userButtonContainer.innerHTML = "";
    }
    if (authLockBanner) authLockBanner.classList.add("visible");
    setInputEnabled(false);
    renderConversationList();
    if (headerTitle) headerTitle.textContent = "New chat";
  }
}

function setInputEnabled(enabled) {
  if (chatInput) {
    chatInput.disabled = !enabled;
    chatInput.placeholder = enabled ? "Message Aura AI..." : "Sign in to start chatting...";
  }
  if (sendBtn) sendBtn.disabled = !enabled;
  if (attachBtn) attachBtn.disabled = !enabled;
  if (micBtn) micBtn.disabled = !enabled;
  if (imageGenBtn) imageGenBtn.disabled = !enabled;
  quickButtons.forEach((b) => (b.disabled = !enabled));
}

// ------------------------- File Attachment -------------------------
if (attachBtn && fileInput) {
  attachBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      attachedFileContent = event.target.result;
      if (fileChipName) fileChipName.textContent = file.name;
      if (fileChip) fileChip.style.display = "inline-flex";
    };
    reader.readAsText(file);
  });
}
if (fileChipRemove) {
  fileChipRemove.addEventListener("click", () => {
    if (fileInput) fileInput.value = "";
    attachedFileContent = "";
    if (fileChip) fileChip.style.display = "none";
  });
}

// ------------------------- Image generation toggle -------------------------
if (imageGenBtn) {
  imageGenBtn.addEventListener("click", () => {
    isImageMode = !isImageMode;
    imageGenBtn.classList.toggle("active", isImageMode);
    imageGenBtn.title = isImageMode ? "Image mode ON — next message generates a picture" : "Generate an image instead of text";
    if (chatInput) chatInput.placeholder = isImageMode ? "Describe the image you want..." : "Message Aura AI...";
  });
}

// ------------------------- Speech Recognition (Mic) -------------------------
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  if (micBtn) {
    micBtn.addEventListener("click", () => {
      recognition.start();
      micBtn.classList.add("active");
    });
  }
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    chatInput.value += (chatInput.value ? " " : "") + transcript;
    autoResizeInput();
    if (micBtn) micBtn.classList.remove("active");
  };
  recognition.onerror = () => { if (micBtn) micBtn.classList.remove("active"); };
  recognition.onend = () => { if (micBtn) micBtn.classList.remove("active"); };
}

// ------------------------- Voice Output -------------------------
if (voiceOutputToggle) {
  voiceOutputToggle.addEventListener("click", () => {
    isVoiceOutputEnabled = !isVoiceOutputEnabled;
    voiceOutputToggle.classList.toggle("active", isVoiceOutputEnabled);
  });
}
function speakText(text) {
  if (!isVoiceOutputEnabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

// ------------------------- Conversations -------------------------
async function loadConversations() {
  loadConversationsFromStorage();
  renderConversationList();
}

function renderConversationList(filter = "") {
  if (!conversationList) return;
  conversationList.innerHTML = "";
  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "conversation-empty";
    empty.textContent = isAuthenticated ? "No chats found" : "No chats yet";
    conversationList.appendChild(empty);
    return;
  }

  filtered.forEach((conv) => {
    const item = document.createElement("div");
    item.className = "conversation-item" + (conv.id === activeConversationId ? " active" : "");
    item.dataset.id = conv.id;

    const title = document.createElement("span");
    title.className = "conversation-title";
    title.textContent = conv.title;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "conversation-delete";
    deleteBtn.textContent = "✕";
    deleteBtn.title = "Delete chat";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteConversation(conv.id);
    });

    item.appendChild(title);
    item.appendChild(deleteBtn);
    item.addEventListener("click", () => selectConversation(conv.id));
    conversationList.appendChild(item);
  });
}

if (searchInput) {
  searchInput.addEventListener("input", () => renderConversationList(searchInput.value));
}

async function startNewChat() {
  activeConversationId = Date.now().toString();
  chatWindow.innerHTML = "";
  addMessage("assistant", "New chat started. What would you like to talk about?");
  if (headerTitle) headerTitle.textContent = "New chat";
  renderConversationList();
  chatInput.focus();
  if (isMobile()) closeSidebar();
}
if (newChatBtn) newChatBtn.addEventListener("click", startNewChat);

function selectConversation(id) {
  activeConversationId = id;
  const current = conversations.find((c) => c.id === id);
  if (current && headerTitle) {
    headerTitle.textContent = current.title;
  }
  renderConversationList();
}

function deleteConversation(id) {
  conversations = conversations.filter((c) => c.id !== id);
  saveConversationsToStorage();
  renderConversationList();
  if (activeConversationId === id) {
    startNewChat();
  }
}

// ------------------------- Markdown -------------------------
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMarkdown(raw) {
  const escaped = escapeHtml(raw);
  const lines = escaped.split("\n");
  let html = "";
  let inList = false;
  let listType = "ul";

  const closeList = () => { if (inList) { html += listType === "ul" ? "</ul>" : "</ol>"; inList = false; } };

  lines.forEach((line) => {
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)/);
    const numberMatch = line.match(/^\s*\d+[.)]\s+(.*)/);

    if (bulletMatch) {
      if (!inList || listType !== "ul") { closeList(); html += "<ul>"; inList = true; listType = "ul"; }
      html += `<li>${inlineMd(bulletMatch[1])}</li>`;
    } else if (numberMatch) {
      if (!inList || listType !== "ol") { closeList(); html += "<ol>"; inList = true; listType = "ol"; }
      html += `<li>${inlineMd(numberMatch[1])}</li>`;
    } else {
      closeList();
      if (line.trim() === "") { html += ""; }
      else { html += `<p>${inlineMd(line)}</p>`; }
    }
  });
  closeList();
  return html;
}

function inlineMd(text) {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

// ------------------------- Chat rendering helpers -------------------------
const AURA_MARK_SVG = `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="20" cy="20" r="19" fill="var(--accent-1)" opacity="0.16"/>
  <circle cx="20" cy="20" r="13.5" fill="var(--accent-2)" opacity="0.32"/>
  <circle cx="20" cy="20" r="8" fill="var(--accent-1)"/>
  <circle cx="16.5" cy="16.5" r="2.3" fill="#fff" opacity="0.55"/>
</svg>`;

const USER_ICON_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="12" cy="8" r="4" fill="#fff"/>
  <path fill="#fff" d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5v1H4v-1Z"/>
</svg>`;

function makeAiAvatar() {
  const avatar = document.createElement("div");
  avatar.className = "avatar avatar-ai";
  avatar.innerHTML = AURA_MARK_SVG;
  return avatar;
}
function makeUserAvatar() {
  const avatar = document.createElement("div");
  avatar.className = "avatar avatar-user";
  avatar.innerHTML = USER_ICON_SVG;
  return avatar;
}

function updateQuickPromptsVisibility() {
  if (!quickPromptsContainer || !chatWindow) return;
  const messageCount = chatWindow.querySelectorAll(".message").length;
  quickPromptsContainer.classList.toggle("hidden", messageCount > 1);
}

function scrollToBottom() {
  if (!chatWindow) return;
  requestAnimationFrame(() => {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  });
}

function addMessage(role, text) {
  if (!chatWindow) return;
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role === "user" ? "message-user" : "message-ai"}`;

  const avatar = role === "user" ? makeUserAvatar() : makeAiAvatar();

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (role === "user") {
    bubble.textContent = text;
  } else {
    bubble.innerHTML = renderMarkdown(text);
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chatWindow.appendChild(wrapper);
  updateQuickPromptsVisibility();
  scrollToBottom();
  return bubble;
}

function addImageMessage(prompt, imageUrl) {
  if (!chatWindow) return;
  const wrapper = document.createElement("div");
  wrapper.className = "message message-ai";
  const avatar = makeAiAvatar();
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = `<p>Here's your image for: <em>${escapeHtml(prompt)}</em></p><img class="gen-image" src="${imageUrl}" alt="${escapeHtml(prompt)}" />`;
  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chatWindow.appendChild(wrapper);
  scrollToBottom();
}

function addTypingIndicator() {
  if (!chatWindow) return;
  const wrapper = document.createElement("div");
  wrapper.className = "message message-ai";
  wrapper.id = "typing-indicator";
  const avatar = makeAiAvatar();
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = `Thinking<span class="typing-dots"><span></span><span></span><span></span></span>`;
  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chatWindow.appendChild(wrapper);
  scrollToBottom();
}
function removeTypingIndicator() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

function renderError(text) {
  if (!chatWindow) return;
  const wrapper = document.createElement("div");
  wrapper.className = "message message-ai";
  const avatar = makeAiAvatar();
  const bubble = document.createElement("div");
  bubble.className = "bubble error-bubble";
  bubble.textContent = text;
  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chatWindow.appendChild(wrapper);
  scrollToBottom();
}

function autoResizeInput() {
  if (!chatInput) return;
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + "px";
}

// ------------------------- Sending messages -------------------------
async function sendMessage(text) {
  if ((!text.trim() && !attachedFileContent) || isSending) return;

  if (!activeConversationId) {
    activeConversationId = Date.now().toString();
  }

  const userTextPrompt = text.trim();

  // If conversation does not exist, save title from first message
  let activeConv = conversations.find((c) => c.id === activeConversationId);
  if (!activeConv) {
    const autoTitle = userTextPrompt.length > 28 ? userTextPrompt.substring(0, 28) + "..." : (userTextPrompt || "New Chat");
    activeConv = { id: activeConversationId, title: autoTitle };
    conversations.unshift(activeConv);
    saveConversationsToStorage();
    renderConversationList();
    if (headerTitle) headerTitle.textContent = autoTitle;
  }

  if (isImageMode) {
    const prompt = userTextPrompt;
    if (!prompt) return;
    addMessage("user", prompt);
    chatInput.value = "";
    autoResizeInput();
    const imageUrl = `${IMAGE_API}${encodeURIComponent(prompt)}?width=768&height=768&nologo=true`;
    addImageMessage(prompt, imageUrl);
    isImageMode = false;
    imageGenBtn.classList.remove("active");
    chatInput.placeholder = "Message Aura AI...";
    return;
  }

  let fullMessage = text;
  if (attachedFileContent) {
    fullMessage += `\n\n[Attached File Content]:\n${attachedFileContent}`;
    if (fileChipRemove) fileChipRemove.click();
  }

  isSending = true;
  if (sendBtn) sendBtn.disabled = true;

  addMessage("user", text);
  chatInput.value = "";
  autoResizeInput();
  addTypingIndicator();

  try {
    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt: fullMessage, model: "groq" }),
    });

    const data = await response.json().catch(() => null);
    removeTypingIndicator();

    if (!response.ok || !data || data.error) {
      renderError(data?.error || "Something went wrong. Please try again.");
      return;
    }

    addMessage("assistant", data.response);
    speakText(data.response.replace(/[*_`#]/g, ""));

  } catch (err) {
    removeTypingIndicator();
    renderError("Couldn't reach Aura AI. Please check your connection.");
    console.error(err);
  } finally {
    isSending = false;
    if (sendBtn) sendBtn.disabled = false;
    if (chatInput) chatInput.focus();
  }
}

if (chatForm) {
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage(chatInput.value);
  });
}
if (chatInput) {
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput.value);
    }
  });
  chatInput.addEventListener("input", autoResizeInput);
}
quickButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    chatInput.value = btn.dataset.prompt;
    chatInput.focus();
    autoResizeInput();
  });
});
