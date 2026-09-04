/**
 * Aura AI — Frontend logic with Markdown Tables & Headings parser
 * + Persistent chat history (sidebar) + initials avatar
 */

const API_BASE = "https://aqsa-aura-ai.aqsasarfraz732.workers.dev";
const CHAT_URL = `${API_BASE}`;
const IMAGE_API = "https://image.pollinations.ai/prompt/";

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const quickButtons = document.querySelectorAll(".quick-btn");
const quickPromptsContainer = document.getElementById("quick-prompts");
const headerTitle = document.getElementById("header-title");
const yearEl = document.getElementById("year");
const newChatBtn = document.getElementById("new-chat-btn");
const conversationList = document.getElementById("conversation-list");
const searchChatsInput = document.getElementById("search-chats");
const userButton = document.getElementById("user-button");
const userNameDisplay = document.getElementById("user-name-display");

// Settings modal elements
const openSettingsBtn = document.getElementById("open-settings-btn");
const closeSettingsBtn = document.getElementById("close-settings-btn");
const settingsOverlay = document.getElementById("settings-overlay");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const avatarFileInput = document.getElementById("avatar-file-input");
const removeAvatarBtn = document.getElementById("remove-avatar-btn");
const settingsAvatarPreview = document.getElementById("settings-avatar-preview");
const appShell = document.getElementById("app-shell");
const signInBtn = document.getElementById("sign-in-btn");
const signUpBtn = document.getElementById("sign-up-btn");
const lockSignInBtn = document.getElementById("lock-sign-in-btn");
const lockSignUpBtn = document.getElementById("lock-sign-up-btn");

let isSending = false;
let isVoiceOutputEnabled = false;
let activeConversationId = null;
let conversations = [];

const WELCOME_HTML = `
  <div class="message message-ai">
    <div class="avatar avatar-ai" aria-hidden="true">
      <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="19" fill="var(--accent-1)" opacity="0.16"/>
        <circle cx="20" cy="20" r="13.5" fill="var(--accent-2)" opacity="0.32"/>
        <circle cx="20" cy="20" r="8" fill="var(--accent-1)"/>
        <circle cx="16.5" cy="16.5" r="2.3" fill="#fff" opacity="0.55"/>
      </svg>
    </div>
    <div class="bubble">
      Welcome to <strong>Aura AI</strong>. Sign in, then start a new chat — every
      conversation is saved to your account and synced across devices.
    </div>
  </div>
`;

if (yearEl) yearEl.textContent = new Date().getFullYear();

// ---------- Avatar (custom-uploaded logo, or initials fallback) ----------
const AVATAR_STORAGE_KEY = "aura_user_avatar";

function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getCurrentUserName() {
  return (userNameDisplay && userNameDisplay.textContent.trim()) || "User";
}

function getStoredAvatar() {
  try {
    return localStorage.getItem(AVATAR_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

function renderUserAvatar() {
  const avatarData = getStoredAvatar();
  const initials = getInitials(getCurrentUserName());

  if (userButton) {
    userButton.innerHTML = avatarData
      ? `<div class="user-avatar-initials"><img src="${avatarData}" alt="Your avatar"/></div>`
      : `<div class="user-avatar-initials">${initials}</div>`;
  }

  if (settingsAvatarPreview) {
    settingsAvatarPreview.innerHTML = avatarData
      ? `<img src="${avatarData}" alt="Your avatar"/>`
      : initials;
  }

  // Refresh any user message avatars already rendered in the current chat
  document.querySelectorAll(".avatar-user").forEach((el) => {
    if (avatarData) {
      el.classList.add("has-image");
      el.innerHTML = `<img src="${avatarData}" alt="You"/>`;
    } else {
      el.classList.remove("has-image");
      el.textContent = initials;
    }
  });
}
renderUserAvatar();

// ---------- Settings modal ----------
function openSettings() {
  if (settingsOverlay) settingsOverlay.classList.add("visible");
}
function closeSettings() {
  if (settingsOverlay) settingsOverlay.classList.remove("visible");
}
if (openSettingsBtn) openSettingsBtn.addEventListener("click", openSettings);
if (closeSettingsBtn) closeSettingsBtn.addEventListener("click", closeSettings);
if (settingsOverlay) {
  settingsOverlay.addEventListener("click", (e) => {
    if (e.target === settingsOverlay) closeSettings();
  });
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
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

if (avatarFileInput) {
  avatarFileInput.addEventListener("change", () => {
    const file = avatarFileInput.files && avatarFileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        localStorage.setItem(AVATAR_STORAGE_KEY, reader.result);
        renderUserAvatar();
      } catch (e) {
        console.error("Couldn't save avatar (file may be too large)", e);
      }
    };
    reader.readAsDataURL(file);
  });
}

if (removeAvatarBtn) {
  removeAvatarBtn.addEventListener("click", () => {
    localStorage.removeItem(AVATAR_STORAGE_KEY);
    renderUserAvatar();
  });
}

// Restore saved theme on load
(function applySavedTheme() {
  const saved = localStorage.getItem("aura-theme");
  if (saved === "light") document.documentElement.setAttribute("data-theme", "light");
})();

// ---------- Clerk auth state (hides Sign In/Sign Up once actually signed in) ----------
function updateAuthUI(user) {
  if (!appShell) return;
  if (user) {
    appShell.classList.add("signed-in");
    if (userNameDisplay) {
      userNameDisplay.textContent =
        user.fullName ||
        user.username ||
        (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) ||
        "Account";
    }
  } else {
    appShell.classList.remove("signed-in");
  }
  renderUserAvatar();
}

function initClerkAuth() {
  function waitForClerk(attemptsLeft = 40) {
    if (window.Clerk) {
      window.Clerk
        .load()
        .then(() => {
          updateAuthUI(window.Clerk.user || null);
          window.Clerk.addListener((state) => {
            updateAuthUI((state && state.user) || null);
          });
        })
        .catch((err) => console.error("Clerk failed to load", err));
    } else if (attemptsLeft > 0) {
      setTimeout(() => waitForClerk(attemptsLeft - 1), 250);
    }
  }
  waitForClerk();
}
initClerkAuth();

function openClerkSignIn() {
  if (window.Clerk) window.Clerk.openSignIn();
}
function openClerkSignUp() {
  if (window.Clerk) window.Clerk.openSignUp();
}
if (signInBtn) signInBtn.addEventListener("click", openClerkSignIn);
if (signUpBtn) signUpBtn.addEventListener("click", openClerkSignUp);
if (lockSignInBtn) lockSignInBtn.addEventListener("click", openClerkSignIn);
if (lockSignUpBtn) lockSignUpBtn.addEventListener("click", openClerkSignUp);

// ---------- Persistence ----------
function saveConversationsToStorage() {
  localStorage.setItem("aura_conversations", JSON.stringify(conversations));
}

function loadConversationsFromStorage() {
  const saved = localStorage.getItem("aura_conversations");
  if (saved) {
    try {
      conversations = JSON.parse(saved);
    } catch (e) {
      console.error("Storage error", e);
      conversations = [];
    }
  }
  renderConversationList();
}

window.addEventListener("load", () => {
  loadConversationsFromStorage();
});

// ---------- Sidebar: conversation list rendering ----------
function renderConversationList(filterText = "") {
  if (!conversationList) return;
  conversationList.innerHTML = "";

  const filtered = filterText
    ? conversations.filter((c) => c.title.toLowerCase().includes(filterText.toLowerCase()))
    : conversations;

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "conversation-empty";
    empty.id = "conversation-empty";
    empty.textContent = conversations.length === 0 ? "No chats yet" : "No matching chats";
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

    const delBtn = document.createElement("button");
    delBtn.className = "conversation-delete";
    delBtn.setAttribute("aria-label", "Delete chat");
    delBtn.innerHTML = "✕";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteConversation(conv.id);
    });

    item.appendChild(title);
    item.appendChild(delBtn);
    item.addEventListener("click", () => loadConversation(conv.id));
    conversationList.appendChild(item);
  });
}

function getActiveConversation() {
  return conversations.find((c) => c.id === activeConversationId) || null;
}

function loadConversation(id) {
  const conv = conversations.find((c) => c.id === id);
  if (!conv) return;

  activeConversationId = id;
  if (headerTitle) headerTitle.textContent = conv.title;
  if (chatWindow) chatWindow.innerHTML = "";

  (conv.messages || []).forEach((msg) => {
    renderMessageBubble(msg.role, msg.text);
  });

  if (quickPromptsContainer) {
    quickPromptsContainer.classList.toggle("hidden", (conv.messages || []).length > 0);
  }

  renderConversationList(searchChatsInput ? searchChatsInput.value : "");
  scrollToBottom();
  closeSidebarOnMobile();
}

function deleteConversation(id) {
  conversations = conversations.filter((c) => c.id !== id);
  saveConversationsToStorage();
  if (activeConversationId === id) {
    startNewChat();
  } else {
    renderConversationList(searchChatsInput ? searchChatsInput.value : "");
  }
}

function startNewChat() {
  activeConversationId = null;
  if (chatWindow) chatWindow.innerHTML = WELCOME_HTML;
  if (headerTitle) headerTitle.textContent = "New chat";
  if (quickPromptsContainer) quickPromptsContainer.classList.remove("hidden");
  if (chatInput) {
    chatInput.value = "";
    chatInput.focus();
  }
  renderConversationList(searchChatsInput ? searchChatsInput.value : "");
  closeSidebarOnMobile();
}

function closeSidebarOnMobile() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (window.innerWidth <= 800 && sidebar && sidebar.classList.contains("open")) {
    sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("visible");
  }
}

if (newChatBtn) newChatBtn.addEventListener("click", startNewChat);

if (searchChatsInput) {
  searchChatsInput.addEventListener("input", () => {
    renderConversationList(searchChatsInput.value);
  });
}

// ---------- Markdown Parser (Supports Headings, Tables, Lists, Bold) ----------
function renderMarkdown(raw) {
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = escaped.split("\n");
  let html = "";
  let inTable = false;
  let tableRows = [];

  const flushTable = () => {
    if (!inTable || tableRows.length === 0) return;
    html += "<table>";
    tableRows.forEach((row, idx) => {
      const cells = row.split("|").map(c => c.trim()).filter(c => c !== "");
      if (idx === 0) {
        html += "<tr>" + cells.map(c => `<th>${inlineMd(c)}</th>`).join("") + "</tr>";
      } else if (!row.includes("---")) {
        html += "<tr>" + cells.map(c => `<td>${inlineMd(c)}</td>`).join("") + "</tr>";
      }
    });
    html += "</table>";
    tableRows = [];
    inTable = false;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (!inTable) inTable = true;
      tableRows.push(trimmed);
      return;
    } else {
      flushTable();
    }

    if (trimmed.startsWith("### ")) {
      html += `<h3>${inlineMd(trimmed.replace("### ", ""))}</h3>`;
    } else if (trimmed.startsWith("## ")) {
      html += `<h2>${inlineMd(trimmed.replace("## ", ""))}</h2>`;
    } else if (trimmed.startsWith("# ")) {
      html += `<h1>${inlineMd(trimmed.replace("# ", ""))}</h1>`;
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      html += `<li>${inlineMd(trimmed.substring(2))}</li>`;
    } else if (trimmed === "") {
      html += "<br/>";
    } else {
      html += `<p>${inlineMd(trimmed)}</p>`;
    }
  });

  flushTable();
  return html;
}

function inlineMd(text) {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function scrollToBottom() {
  if (!chatWindow) return;
  requestAnimationFrame(() => {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  });
}

// Renders a bubble WITHOUT touching storage (used when replaying saved history)
function renderMessageBubble(role, text) {
  if (!chatWindow) return;
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role === "user" ? "message-user" : "message-ai"}`;

  const avatar = document.createElement("div");
  if (role === "user") {
    const avatarData = getStoredAvatar();
    if (avatarData) {
      avatar.className = "avatar avatar-user has-image";
      avatar.innerHTML = `<img src="${avatarData}" alt="You"/>`;
    } else {
      avatar.className = "avatar avatar-user";
      avatar.textContent = getInitials(getCurrentUserName());
    }
  } else {
    avatar.className = "avatar avatar-ai";
    avatar.innerHTML = "✨";
  }

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
}

// Renders a bubble AND saves it into the active conversation's history
function addMessage(role, text) {
  renderMessageBubble(role, text);
  scrollToBottom();

  const conv = getActiveConversation();
  if (conv) {
    conv.messages = conv.messages || [];
    conv.messages.push({ role, text });
    saveConversationsToStorage();
  }
}

function addTypingIndicator() {
  if (!chatWindow) return;
  const wrapper = document.createElement("div");
  wrapper.className = "message message-ai";
  wrapper.id = "typing-indicator";
  wrapper.innerHTML = `<div class="avatar avatar-ai">✨</div><div class="bubble">Thinking...</div>`;
  chatWindow.appendChild(wrapper);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

async function sendMessage(text) {
  if (!text.trim() || isSending) return;

  if (!activeConversationId) {
    activeConversationId = Date.now().toString();
    const userText = text.trim();
    const autoTitle = userText.length > 25 ? userText.substring(0, 25) + "..." : userText;
    conversations.unshift({ id: activeConversationId, title: autoTitle, messages: [] });
    saveConversationsToStorage();
    if (headerTitle) headerTitle.textContent = autoTitle;
  }

  const userText = text.trim();
  isSending = true;
  if (sendBtn) sendBtn.disabled = true;
  if (quickPromptsContainer) quickPromptsContainer.classList.add("hidden");

  addMessage("user", userText);
  renderConversationList(searchChatsInput ? searchChatsInput.value : "");
  chatInput.value = "";
  addTypingIndicator();

  try {
    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userText, model: "groq" }),
    });

    const data = await response.json().catch(() => null);
    removeTypingIndicator();

    if (!response.ok || !data || data.error) {
      addMessage("assistant", data?.error || "Something went wrong.");
      return;
    }

    addMessage("assistant", data.response);
  } catch (err) {
    removeTypingIndicator();
    addMessage("assistant", "Couldn't reach Aura AI. Check your internet connection.");
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
}
quickButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    chatInput.value = btn.dataset.prompt;
    chatInput.focus();
  });
});
