/**
 * Aura AI — Frontend logic with Markdown Tables & Headings parser
 * + Persistent chat history (sidebar, pin/archive)
 * + Image generation, voice input/output, message actions (copy/feedback/share)
 * + Clerk auth actions (logout, add account, security/2FA management)
 */

const API_BASE = "https://aqsa-aura-ai.aqsasarfraz732.workers.dev";
const CHAT_URL = `${API_BASE}`;
const IMAGE_API = "https://image.pollinations.ai/prompt/";

const chatWindow = document.getElementById("chat-window");
const chatMessagesInner = document.getElementById("chat-messages-inner");
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

// Input bar extra controls
const micBtn = document.getElementById("mic-btn");
const imageGenBtn = document.getElementById("image-gen-btn");
const voiceOutputToggle = document.getElementById("voice-output-toggle");

// Auth action buttons
const logoutBtn = document.getElementById("logout-btn");
const settingsLogoutBtn = document.getElementById("settings-logout-btn");
const addAccountBtn = document.getElementById("add-account-btn");
const securitySettingsBtn = document.getElementById("security-settings-btn");

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
let isImageMode = false;
let isRecording = false;
let recognition = null;
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
      ? `<div class="user-avatar-initials"><img class="avatar-img" src="${avatarData}" alt="Your avatar"/></div>`
      : `<div class="user-avatar-initials">${initials}</div>`;
  }

  if (settingsAvatarPreview) {
    settingsAvatarPreview.innerHTML = avatarData
      ? `<img class="avatar-img" src="${avatarData}" alt="Your avatar"/>`
      : initials;
  }

  // Refresh any user message avatars already rendered in the current chat
  document.querySelectorAll(".avatar-user").forEach((el) => {
    if (avatarData) {
      el.classList.add("has-image");
      el.innerHTML = `<img class="avatar-img" src="${avatarData}" alt="You"/>`;
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

// ---------- Theme (dark/light) ----------
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

// Restore saved theme on load (before paint-critical stuff runs)
(function applySavedTheme() {
  const saved = localStorage.getItem("aura-theme");
  if (saved === "light") document.documentElement.setAttribute("data-theme", "light");
})();

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
          // Fallback: periodically re-check in case the listener misses an update
          setInterval(() => {
            updateAuthUI(window.Clerk.user || null);
          }, 2000);
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

// ---------- Logout ----------
function handleLogout() {
  if (!window.Clerk) return;
  window.Clerk.signOut()
    .then(() => {
      updateAuthUI(null);
    })
    .catch((err) => console.error("Sign out failed", err));
}
if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
if (settingsLogoutBtn) {
  settingsLogoutBtn.addEventListener("click", () => {
    handleLogout();
    closeSettings();
  });
}

// ---------- Add account (requires "multi-session" enabled in Clerk Dashboard) ----------
if (addAccountBtn) {
  addAccountBtn.addEventListener("click", () => {
    if (!window.Clerk) return;
    window.Clerk.openSignIn({ afterSignInUrl: window.location.href });
  });
}

// ---------- Security / two-step verification (managed inside Clerk's own profile UI) ----------
if (securitySettingsBtn) {
  securitySettingsBtn.addEventListener("click", () => {
    if (!window.Clerk) return;
    window.Clerk.openUserProfile();
  });
}

// ---------- Persistence ----------
function saveConversationsToStorage() {
  localStorage.setItem("aura_conversations", JSON.stringify(conversations));
}

function loadConversationsFromStorage() {
  const saved = localStorage.getItem("aura_conversations");
  if (saved) {
    try {
      conversations = JSON.parse(saved);
      // Backfill fields for chats saved before pin/archive existed
      conversations.forEach((c) => {
        if (typeof c.pinned !== "boolean") c.pinned = false;
        if (typeof c.archived !== "boolean") c.archived = false;
      });
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

// ---------- Sidebar: conversation list rendering (with pin + archive) ----------
function makeSectionLabel(text, collapsible = false) {
  const label = document.createElement("div");
  label.className = "sidebar-section-label" + (collapsible ? " archived-label" : "");
  label.textContent = collapsible ? `${text} ▾` : text;
  return label;
}

function buildConversationItem(conv) {
  const item = document.createElement("div");
  item.className =
    "conversation-item" +
    (conv.id === activeConversationId ? " active" : "") +
    (conv.pinned ? " pinned" : "");
  item.dataset.id = conv.id;

  const title = document.createElement("span");
  title.className = "conversation-title";
  title.textContent = conv.title;

  const actions = document.createElement("div");
  actions.className = "conversation-actions";

  const pinBtn = document.createElement("button");
  pinBtn.className = "conversation-pin-icon" + (conv.pinned ? " active" : "");
  pinBtn.setAttribute("aria-label", conv.pinned ? "Unpin chat" : "Pin chat");
  pinBtn.title = conv.pinned ? "Unpin" : "Pin";
  pinBtn.innerHTML = "📌";
  pinBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePin(conv.id);
  });

  const archiveBtn = document.createElement("button");
  archiveBtn.setAttribute("aria-label", conv.archived ? "Unarchive chat" : "Archive chat");
  archiveBtn.title = conv.archived ? "Unarchive" : "Archive";
  archiveBtn.innerHTML = conv.archived ? "📤" : "🗄️";
  archiveBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleArchive(conv.id);
  });

  const delBtn = document.createElement("button");
  delBtn.className = "conversation-delete";
  delBtn.setAttribute("aria-label", "Delete chat");
  delBtn.innerHTML = "✕";
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteConversation(conv.id);
  });

  actions.appendChild(pinBtn);
  actions.appendChild(archiveBtn);
  actions.appendChild(delBtn);

  item.appendChild(title);
  item.appendChild(actions);
  item.addEventListener("click", () => loadConversation(conv.id));
  return item;
}

function renderConversationList(filterText = "") {
  if (!conversationList) return;
  conversationList.innerHTML = "";

  const term = filterText.toLowerCase();
  const matches = (c) => !term || c.title.toLowerCase().includes(term);

  const visible = conversations.filter((c) => !c.archived && matches(c));
  const pinned = visible.filter((c) => c.pinned);
  const recent = visible.filter((c) => !c.pinned);
  const archived = conversations.filter((c) => c.archived && matches(c));

  if (pinned.length === 0 && recent.length === 0) {
    const empty = document.createElement("div");
    empty.className = "conversation-empty";
    empty.id = "conversation-empty";
    empty.textContent = conversations.length === 0 ? "No chats yet" : "No matching chats";
    conversationList.appendChild(empty);
  } else {
    if (pinned.length) {
      conversationList.appendChild(makeSectionLabel("Pinned"));
      pinned.forEach((c) => conversationList.appendChild(buildConversationItem(c)));
    }
    if (recent.length) {
      if (pinned.length) conversationList.appendChild(makeSectionLabel("Chats"));
      recent.forEach((c) => conversationList.appendChild(buildConversationItem(c)));
    }
  }

  if (archived.length) {
    const archLabel = makeSectionLabel(`Archived (${archived.length})`, true);
    const archContainer = document.createElement("div");
    archContainer.className = "archived-container hidden";
    archived.forEach((c) => archContainer.appendChild(buildConversationItem(c)));
    archLabel.addEventListener("click", () => archContainer.classList.toggle("hidden"));
    conversationList.appendChild(archLabel);
    conversationList.appendChild(archContainer);
  }
}

function getActiveConversation() {
  return conversations.find((c) => c.id === activeConversationId) || null;
}

function togglePin(id) {
  const conv = conversations.find((c) => c.id === id);
  if (!conv) return;
  conv.pinned = !conv.pinned;
  saveConversationsToStorage();
  renderConversationList(searchChatsInput ? searchChatsInput.value : "");
}

function toggleArchive(id) {
  const conv = conversations.find((c) => c.id === id);
  if (!conv) return;
  conv.archived = !conv.archived;
  saveConversationsToStorage();
  if (activeConversationId === id && conv.archived) {
    startNewChat();
  } else {
    renderConversationList(searchChatsInput ? searchChatsInput.value : "");
  }
}

function loadConversation(id) {
  const conv = conversations.find((c) => c.id === id);
  if (!conv) return;

  activeConversationId = id;
  if (headerTitle) headerTitle.textContent = conv.title;
  if (chatMessagesInner) chatMessagesInner.innerHTML = "";

  (conv.messages || []).forEach((msg) => {
    renderMessageBubble(msg.role, msg.text, msg);
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
  if (chatMessagesInner) chatMessagesInner.innerHTML = WELCOME_HTML;
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

// ---------- Mobile sidebar open/close wiring ----------
(function wireSidebarToggles() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const openBtn = document.getElementById("sidebar-open");
  const openFloatBtn = document.getElementById("sidebar-open-float");
  const closeBtn = document.getElementById("sidebar-close");

  function openSidebar() {
    if (sidebar) sidebar.classList.add("open");
    if (overlay) overlay.classList.add("visible");
    if (appShell) appShell.classList.remove("sidebar-collapsed");
  }
  function collapseSidebar() {
    if (window.innerWidth <= 800) {
      if (sidebar) sidebar.classList.remove("open");
      if (overlay) overlay.classList.remove("visible");
    } else if (appShell) {
      appShell.classList.add("sidebar-collapsed");
    }
  }

  if (openBtn) openBtn.addEventListener("click", openSidebar);
  if (openFloatBtn) openFloatBtn.addEventListener("click", openSidebar);
  if (closeBtn) closeBtn.addEventListener("click", collapseSidebar);
  if (overlay) overlay.addEventListener("click", collapseSidebar);
})();

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

function stripMarkdownForSpeech(text) {
  return text
    .replace(/[#*`_>|]/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ");
}

function scrollToBottom() {
  if (!chatWindow) return;
  requestAnimationFrame(() => {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  });
}

// ---------- Message action toolbar (copy / feedback / share / read aloud) ----------
function buildMessageActions(text, extra = {}) {
  const bar = document.createElement("div");
  bar.className = "msg-actions";

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.title = "Copy";
  copyBtn.setAttribute("aria-label", "Copy response");
  copyBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/></svg>';
  copyBtn.addEventListener("click", () => {
    const toCopy = extra.imageUrl ? extra.imageUrl : text;
    navigator.clipboard
      .writeText(toCopy)
      .then(() => {
        const original = copyBtn.title;
        copyBtn.title = "Copied!";
        setTimeout(() => (copyBtn.title = original), 1500);
      })
      .catch(() => {});
  });

  const upBtn = document.createElement("button");
  upBtn.type = "button";
  upBtn.title = "Good response";
  upBtn.setAttribute("aria-label", "Good response");
  upBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M2 21h2a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H2v11Zm19.83-9.6c.11-.25.17-.53.17-.82V9a2 2 0 0 0-2-2h-5.5l.85-4.11.02-.22c0-.38-.15-.72-.4-.97L13.99 1 7.5 7.5C7.19 7.81 7 8.24 7 8.71V19c0 1.1.9 2 2 2h9a2 2 0 0 0 1.83-1.19l3-6.99Z"/></svg>';

  const downBtn = document.createElement("button");
  downBtn.type = "button";
  downBtn.title = "Bad response";
  downBtn.setAttribute("aria-label", "Bad response");
  downBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M22 3h-2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2V3ZM2.17 12.6c-.11.25-.17.53-.17.82V15a2 2 0 0 0 2 2h5.5l-.85 4.11-.02.22c0 .38.15.72.4.97L10.01 23 16.5 16.5c.31-.31.5-.74.5-1.21V5c0-1.1-.9-2-2-2H6a2 2 0 0 0-1.83 1.19l-3 6.99Z"/></svg>';

  upBtn.addEventListener("click", () => {
    const nowActive = !upBtn.classList.contains("active-feedback-up");
    upBtn.classList.toggle("active-feedback-up", nowActive);
    downBtn.classList.remove("active-feedback-down");
  });
  downBtn.addEventListener("click", () => {
    const nowActive = !downBtn.classList.contains("active-feedback-down");
    downBtn.classList.toggle("active-feedback-down", nowActive);
    upBtn.classList.remove("active-feedback-up");
  });

  const shareBtn = document.createElement("button");
  shareBtn.type = "button";
  shareBtn.title = "Share";
  shareBtn.setAttribute("aria-label", "Share response");
  shareBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81a3 3 0 1 0-3-3c0 .24.04.47.09.7L8.04 9.81A3 3 0 1 0 6 14.7l7.13 4.15c-.05.21-.08.43-.08.65a2.99 2.99 0 1 0 4.95-2.42Z"/></svg>';
  shareBtn.addEventListener("click", async () => {
    const shareText = extra.imageUrl ? extra.imageUrl : text;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Aura AI", text: shareText });
      } catch (e) {
        /* user cancelled share sheet — ignore */
      }
    } else {
      navigator.clipboard.writeText(shareText).catch(() => {});
      const original = shareBtn.title;
      shareBtn.title = "Copied to share!";
      setTimeout(() => (shareBtn.title = original), 1500);
    }
  });

  const speakBtn = document.createElement("button");
  speakBtn.type = "button";
  speakBtn.title = "Read aloud";
  speakBtn.setAttribute("aria-label", "Read response aloud");
  speakBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12Z"/></svg>';
  speakBtn.addEventListener("click", () => {
    if (!extra.imageUrl) speakText(text);
  });

  bar.appendChild(copyBtn);
  bar.appendChild(upBtn);
  bar.appendChild(downBtn);
  bar.appendChild(shareBtn);
  if (!extra.imageUrl) bar.appendChild(speakBtn);
  return bar;
}

// Renders a bubble WITHOUT touching storage (used when replaying saved history)
function renderMessageBubble(role, text, extra = {}) {
  if (!chatMessagesInner) return;
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role === "user" ? "message-user" : "message-ai"}`;

  const avatar = document.createElement("div");
  if (role === "user") {
    const avatarData = getStoredAvatar();
    if (avatarData) {
      avatar.className = "avatar avatar-user has-image";
      avatar.innerHTML = `<img class="avatar-img" src="${avatarData}" alt="You"/>`;
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
  } else if (extra.imageUrl) {
    const img = document.createElement("img");
    img.className = "ai-generated-image";
    img.src = extra.imageUrl;
    img.alt = extra.imagePrompt || "Generated image";
    img.loading = "lazy";
    bubble.appendChild(img);
  } else {
    bubble.innerHTML = renderMarkdown(text);
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);

  if (role !== "user") {
    wrapper.appendChild(buildMessageActions(text, extra));
  }

  chatMessagesInner.appendChild(wrapper);
}

// Renders a bubble AND saves it into the active conversation's history
function addMessage(role, text, extra = {}) {
  renderMessageBubble(role, text, extra);
  scrollToBottom();

  const conv = getActiveConversation();
  if (conv) {
    conv.messages = conv.messages || [];
    conv.messages.push({ role, text, ...extra });
    saveConversationsToStorage();
  }
}

function addTypingIndicator(label = "Thinking...") {
  if (!chatMessagesInner) return;
  const wrapper = document.createElement("div");
  wrapper.className = "message message-ai";
  wrapper.id = "typing-indicator";
  wrapper.innerHTML = `<div class="avatar avatar-ai">✨</div><div class="bubble">${label}</div>`;
  chatMessagesInner.appendChild(wrapper);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

// ---------- Voice output (text-to-speech) ----------
function speakText(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(stripMarkdownForSpeech(text));
  window.speechSynthesis.speak(utterance);
}

if (voiceOutputToggle) {
  voiceOutputToggle.addEventListener("click", () => {
    isVoiceOutputEnabled = !isVoiceOutputEnabled;
    voiceOutputToggle.classList.toggle("active", isVoiceOutputEnabled);
    voiceOutputToggle.title = isVoiceOutputEnabled
      ? "Voice replies: on (AI speaks answers aloud)"
      : "Voice replies (AI speaks answers aloud)";
    if (!isVoiceOutputEnabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  });
}

// ---------- Voice input (speech-to-text) ----------
function initSpeechRecognition() {
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) return null;

  const rec = new SpeechRecognitionCtor();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (chatInput) {
      chatInput.value = chatInput.value ? `${chatInput.value} ${transcript}` : transcript;
      chatInput.focus();
    }
  };
  rec.onend = () => {
    isRecording = false;
    if (micBtn) micBtn.classList.remove("active");
  };
  rec.onerror = () => {
    isRecording = false;
    if (micBtn) micBtn.classList.remove("active");
  };
  return rec;
}

if (micBtn) {
  micBtn.addEventListener("click", () => {
    if (!recognition) recognition = initSpeechRecognition();
    if (!recognition) {
      addMessage("assistant", "Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (isRecording) {
      recognition.stop();
      isRecording = false;
      micBtn.classList.remove("active");
    } else {
      try {
        recognition.start();
        isRecording = true;
        micBtn.classList.add("active");
      } catch (e) {
        /* already started — ignore */
      }
    }
  });
}

// ---------- Image generation mode ----------
if (imageGenBtn) {
  imageGenBtn.addEventListener("click", () => {
    isImageMode = !isImageMode;
    imageGenBtn.classList.toggle("active", isImageMode);
    imageGenBtn.title = isImageMode
      ? "Image generation mode: on"
      : "Generate an image instead of text";
    if (chatInput) {
      chatInput.placeholder = isImageMode
        ? "Describe the image you want to generate..."
        : "Message Aura AI...";
    }
  });
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = url;
  });
}

async function sendImageGenerationRequest(prompt) {
  addTypingIndicator("Generating image...");
  try {
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `${IMAGE_API}${encodeURIComponent(prompt)}?width=768&height=768&seed=${seed}&nologo=true`;
    await preloadImage(imageUrl);
    removeTypingIndicator();
    addMessage("assistant", `Here's your generated image for: "${prompt}"`, {
      imageUrl,
      imagePrompt: prompt,
    });
  } catch (err) {
    removeTypingIndicator();
    addMessage(
      "assistant",
      "Couldn't generate that image. Please try a different prompt or check your connection."
    );
  } finally {
    isSending = false;
    if (sendBtn) sendBtn.disabled = false;
    if (chatInput) chatInput.focus();
  }
}

// ---------- Sending messages ----------
function ensureActiveConversation(promptText) {
  if (activeConversationId) return;
  activeConversationId = Date.now().toString();
  const autoTitle = promptText.length > 25 ? promptText.substring(0, 25) + "..." : promptText;
  conversations.unshift({
    id: activeConversationId,
    title: autoTitle,
    messages: [],
    pinned: false,
    archived: false,
  });
  saveConversationsToStorage();
  if (headerTitle) headerTitle.textContent = autoTitle;
}

async function sendMessage(text) {
  if (!text.trim() || isSending) return;
  const userText = text.trim();

  ensureActiveConversation(userText);

  isSending = true;
  if (sendBtn) sendBtn.disabled = true;
  if (quickPromptsContainer) quickPromptsContainer.classList.add("hidden");

  addMessage("user", userText);
  renderConversationList(searchChatsInput ? searchChatsInput.value : "");
  chatInput.value = "";

  if (isImageMode) {
    await sendImageGenerationRequest(userText);
    return;
  }

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
    if (isVoiceOutputEnabled) speakText(data.response);
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
