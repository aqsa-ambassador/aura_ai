/**
 * Aura AI — Frontend logic with Markdown Tables & Headings parser
 * + Persistent chat history, Image gen, Voice input/output, Multi-file upload, 3-way theme, Clerk auth
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

const micBtn = document.getElementById("mic-btn");
const imageGenBtn = document.getElementById("image-gen-btn");
const voiceOutputToggle = document.getElementById("voice-output-toggle");
const attachBtn = document.getElementById("attach-btn");
const fileInput = document.getElementById("file-input");
const fileChipsContainer = document.getElementById("file-chips");
const imageGenBar = document.getElementById("image-gen-bar");
const aspectRatioGroup = document.getElementById("aspect-ratio-group");

const logoutBtn = document.getElementById("logout-btn");
const settingsLogoutBtn = document.getElementById("settings-logout-btn");
const addAccountBtn = document.getElementById("add-account-btn");
const switcherAddAccountBtn = document.getElementById("switcher-add-account-btn");
const securitySettingsBtn = document.getElementById("security-settings-btn");
const accountSwitcherBtn = document.getElementById("account-switcher-btn");
const accountSwitcherPopover = document.getElementById("account-switcher-popover");
const accountSwitcherList = document.getElementById("account-switcher-list");

const shareChatBtn = document.getElementById("share-chat-btn");
const sharePopover = document.getElementById("share-popover");
const sharePopoverTitle = document.getElementById("share-popover-title");
const closeSharePopoverBtn = document.getElementById("close-share-popover-btn");
const shareLinkInput = document.getElementById("share-link-input");
const copyShareLinkBtn = document.getElementById("copy-share-link-btn");
const shareWhatsappBtn = document.getElementById("share-whatsapp-btn");
const shareEmailBtn = document.getElementById("share-email-btn");
const shareMoreBtn = document.getElementById("share-more-btn");
const stopShareBtn = document.getElementById("stop-share-btn");

const sharedViewOverlay = document.getElementById("shared-view-overlay");
const sharedViewTitle = document.getElementById("shared-view-title");
const sharedViewMessages = document.getElementById("shared-view-messages");
const closeSharedViewBtn = document.getElementById("close-shared-view-btn");
const openInAuraBtn = document.getElementById("open-in-aura-btn");

const liveAssistantBtn = document.getElementById("live-assistant-btn");
const liveAssistantPanel = document.getElementById("live-assistant-panel");
const liveAssistantVideo = document.getElementById("live-assistant-video");
const closeLiveAssistantBtn = document.getElementById("close-live-assistant-btn");
const stopLiveAssistantBtn = document.getElementById("stop-live-assistant-btn");
const askAboutScreenBtn = document.getElementById("ask-about-screen-btn");

const openSettingsBtn = document.getElementById("open-settings-btn");
const closeSettingsBtn = document.getElementById("close-settings-btn");
const settingsOverlay = document.getElementById("settings-overlay");
const themeSegmented = document.getElementById("theme-segmented");
const themeCycleBtn = document.getElementById("theme-cycle-btn");
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
let selectedAspectRatio = "1:1";
let isRecording = false;
let recognition = null;
let activeConversationId = null;
let conversations = [];
let pendingAttachments = [];
let currentShareConv = null;
let liveStream = null;

const WELCOME_HTML = `
  <div class="message message-ai">
    <div class="bubble">
      Welcome to <strong>Aura AI</strong>. Sign in, then start a new chat — every conversation is saved to your account and synced across devices.
    </div>
  </div>
`;

if (yearEl) yearEl.textContent = new Date().getFullYear();

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
}
renderUserAvatar();

function openSettings() {
  if (settingsOverlay) settingsOverlay.classList.add("visible");
  refreshAccountSwitcherList();
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

const THEME_STORAGE_KEY = "aura-theme-pref";
const prefersDarkMedia = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

const themeIconLight = document.getElementById("theme-icon-light");
const themeIconDark = document.getElementById("theme-icon-dark");
const themeIconAuto = document.getElementById("theme-icon-auto");

function getThemePref() {
  return localStorage.getItem(THEME_STORAGE_KEY) || "auto";
}

function resolveEffectiveTheme(pref) {
  if (pref === "auto") {
    return prefersDarkMedia && !prefersDarkMedia.matches ? "light" : "dark";
  }
  return pref;
}

function applyTheme(pref) {
  const effective = resolveEffectiveTheme(pref);
  if (effective === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }

  if (themeIconLight && themeIconDark && themeIconAuto && themeCycleBtn) {
    themeIconLight.style.display = pref === "light" ? "block" : "none";
    themeIconDark.style.display = pref === "dark" ? "block" : "none";
    themeIconAuto.style.display = pref === "auto" ? "block" : "none";
    const label = pref === "light" ? "Light" : pref === "dark" ? "Dark" : "Auto";
    themeCycleBtn.title = `Theme: ${label} (click to change)`;
  }

  if (themeSegmented) {
    themeSegmented.querySelectorAll(".theme-seg-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.themeValue === pref);
    });
  }
}

function setThemePref(pref) {
  localStorage.setItem(THEME_STORAGE_KEY, pref);
  localStorage.removeItem("aura-theme");
  applyTheme(pref);
}

if (themeCycleBtn) {
  themeCycleBtn.addEventListener("click", () => {
    const order = ["light", "dark", "auto"];
    const current = getThemePref();
    const next = order[(order.indexOf(current) + 1) % order.length];
    setThemePref(next);
  });
}

if (themeSegmented) {
  themeSegmented.querySelectorAll(".theme-seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => setThemePref(btn.dataset.themeValue));
  });
}

(function initTheme() {
  const legacy = localStorage.getItem("aura-theme");
  if (legacy && !localStorage.getItem(THEME_STORAGE_KEY)) {
    localStorage.setItem(THEME_STORAGE_KEY, legacy === "light" ? "light" : "dark");
  }
  applyTheme(getThemePref());
})();

if (avatarFileInput) {
  avatarFileInput.addEventListener("change", () => {
    const file = avatarFileInput.files && avatarFileInput.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        localStorage.setItem(AVATAR_STORAGE_KEY, reader.result);
        renderUserAvatar();
      } catch (e) {
        console.error("Avatar error", e);
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

function updateAuthUI(user) {
  if (!appShell) return;
  if (user) {
    appShell.classList.add("signed-in");
    if (userNameDisplay) {
      userNameDisplay.textContent = user.fullName || user.username || (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) || "Account";
    }
  } else {
    appShell.classList.remove("signed-in");
  }
  renderUserAvatar();
  refreshAccountSwitcherList();
}

function initClerkAuth() {
  function waitForClerk(attemptsLeft = 40) {
    if (window.Clerk) {
      window.Clerk.load().then(() => {
        updateAuthUI(window.Clerk.user || null);
        window.Clerk.addListener((state) => {
          updateAuthUI((state && state.user) || null);
        });
      }).catch((err) => console.error("Clerk error", err));
    } else if (attemptsLeft > 0) {
      setTimeout(() => waitForClerk(attemptsLeft - 1), 250);
    }
  }
  waitForClerk();
}
initClerkAuth();

function openClerkSignIn() { if (window.Clerk) window.Clerk.openSignIn(); }
function openClerkSignUp() { if (window.Clerk) window.Clerk.openSignUp(); }
if (signInBtn) signInBtn.addEventListener("click", openClerkSignIn);
if (signUpBtn) signUpBtn.addEventListener("click", openClerkSignUp);
if (lockSignInBtn) lockSignInBtn.addEventListener("click", openClerkSignIn);
if (lockSignUpBtn) lockSignUpBtn.addEventListener("click", openClerkSignUp);

function handleLogout() {
  if (!window.Clerk) return;
  window.Clerk.signOut().then(() => updateAuthUI(null)).catch((err) => console.error(err));
}
if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
if (settingsLogoutBtn) {
  settingsLogoutBtn.addEventListener("click", () => {
    handleLogout();
    closeSettings();
  });
}

function handleAddAccount() {
  if (!window.Clerk) return;
  window.Clerk.openSignIn({ afterSignInUrl: window.location.href });
}
if (addAccountBtn) addAccountBtn.addEventListener("click", handleAddAccount);
if (switcherAddAccountBtn) {
  switcherAddAccountBtn.addEventListener("click", () => {
    closeAccountSwitcher();
    handleAddAccount();
  });
}

if (securitySettingsBtn) {
  securitySettingsBtn.addEventListener("click", () => {
    if (!window.Clerk) return;
    window.Clerk.openUserProfile();
  });
}

function closeAccountSwitcher() {
  if (accountSwitcherPopover) accountSwitcherPopover.classList.remove("visible");
}
function toggleAccountSwitcher() {
  if (!accountSwitcherPopover) return;
  refreshAccountSwitcherList();
  accountSwitcherPopover.classList.toggle("visible");
}
if (accountSwitcherBtn) {
  accountSwitcherBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleAccountSwitcher();
  });
}
document.addEventListener("click", (e) => {
  if (accountSwitcherPopover && accountSwitcherPopover.classList.contains("visible") && !accountSwitcherPopover.contains(e.target) && e.target !== accountSwitcherBtn) {
    closeAccountSwitcher();
  }
});

function refreshAccountSwitcherList() {
  if (!accountSwitcherList) return;
  accountSwitcherList.innerHTML = "";
  const client = window.Clerk && window.Clerk.client;
  const sessions = (client && client.sessions) || [];
  const activeSessionId = window.Clerk && window.Clerk.session && window.Clerk.session.id;
  const validSessions = sessions.filter((s) => s.status === "active" && s.user);

  if (validSessions.length === 0) {
    accountSwitcherList.innerHTML = '<div class="account-switcher-empty">No other accounts</div>';
    return;
  }

  validSessions.forEach((session) => {
    const user = session.user;
    const name = user.fullName || user.username || (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) || "Account";
    const isCurrent = session.id === activeSessionId;

    const item = document.createElement("button");
    item.type = "button";
    item.className = "account-switcher-item" + (isCurrent ? " current" : "");

    const avatar = document.createElement("div");
    avatar.className = "switcher-avatar";
    if (user.imageUrl) {
      avatar.innerHTML = `<img class="avatar-img" src="${user.imageUrl}" alt="${name}"/>`;
    } else {
      avatar.textContent = getInitials(name);
    }

    const nameEl = document.createElement("span");
    nameEl.className = "switcher-name";
    nameEl.textContent = name;

    item.appendChild(avatar);
    item.appendChild(nameEl);

    if (isCurrent) {
      const check = document.createElement("span");
      check.className = "switcher-check";
      check.innerHTML = "✓";
      item.appendChild(check);
    }

    item.addEventListener("click", () => {
      if (!isCurrent && window.Clerk) {
        window.Clerk.setActive({ session: session.id }).then(() => {
          closeAccountSwitcher();
          updateAuthUI(window.Clerk.user || null);
        });
      } else {
        closeAccountSwitcher();
      }
    });
    accountSwitcherList.appendChild(item);
  });
}

function saveConversationsToStorage() {
  localStorage.setItem("aura_conversations", JSON.stringify(conversations));
}

function loadConversationsFromStorage() {
  const saved = localStorage.getItem("aura_conversations");
  if (saved) {
    try {
      conversations = JSON.parse(saved);
      conversations.forEach((c) => {
        if (typeof c.pinned !== "boolean") c.pinned = false;
        if (typeof c.archived !== "boolean") c.archived = false;
      });
    } catch (e) {
      conversations = [];
    }
  }
  renderConversationList();
}

window.addEventListener("load", () => { loadConversationsFromStorage(); });

function makeSectionLabel(text, collapsible = false) {
  const label = document.createElement("div");
  label.className = "sidebar-section-label" + (collapsible ? " archived-label" : "");
  label.textContent = collapsible ? `${text} ▾` : text;
  return label;
}

function buildConversationItem(conv) {
  const item = document.createElement("div");
  item.className = "conversation-item" + (conv.id === activeConversationId ? " active" : "") + (conv.pinned ? " pinned" : "");
  item.dataset.id = conv.id;

  const title = document.createElement("span");
  title.className = "conversation-title";
  title.textContent = conv.title;

  const actions = document.createElement("div");
  actions.className = "conversation-actions";

  const pinBtn = document.createElement("button");
  pinBtn.className = "conversation-pin-icon" + (conv.pinned ? " active" : "");
  pinBtn.title = conv.pinned ? "Unpin" : "Pin";
  pinBtn.innerHTML = "📌";
  pinBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePin(conv.id);
  });

  const archiveBtn = document.createElement("button");
  archiveBtn.title = conv.archived ? "Unarchive" : "Archive";
  archiveBtn.innerHTML = conv.archived ? "📤" : "🗄️";
  archiveBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleArchive(conv.id);
  });

  const delBtn = document.createElement("button");
  delBtn.className = "conversation-delete";
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

  if (pinned.length === 0 && recent.length === 0) {
    const empty = document.createElement("div");
    empty.className = "conversation-empty";
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
  clearAttachments();
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

function renderMarkdown(raw) {
  const escaped = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
  return text.replace(/[#*`_>|]/g, "").replace(/\n{2,}/g, ". ").replace(/\n/g, " ");
}

function scrollToBottom() {
  if (!chatWindow) return;
  requestAnimationFrame(() => {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  });
}

function buildMessageActions(text, extra = {}) {
  const bar = document.createElement("div");
  bar.className = "msg-actions";

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.title = "Copy";
  copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/></svg>';
  copyBtn.addEventListener("click", () => {
    const toCopy = extra.imageUrl ? extra.imageUrl : text;
    navigator.clipboard.writeText(toCopy).then(() => {
      const original = copyBtn.title;
      copyBtn.title = "Copied!";
      setTimeout(() => (copyBtn.title = original), 1500);
    });
  });

  const speakBtn = document.createElement("button");
  speakBtn.type = "button";
  speakBtn.title = "Read aloud";
  speakBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12Z"/></svg>';
  speakBtn.addEventListener("click", () => {
    if (!extra.imageUrl) speakText(text);
  });

  bar.appendChild(copyBtn);
  if (!extra.imageUrl) bar.appendChild(speakBtn);
  return bar;
}

// User message action toolbar: Copy & Edit feature
function buildUserMessageActions(messageWrapper, bubbleEl, text, msgIndex) {
  const bar = document.createElement("div");
  bar.className = "user-msg-actions";

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.title = "Copy";
  copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/></svg>';
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.title = "Copied!";
      setTimeout(() => (copyBtn.title = "Copy"), 1500);
    });
  });

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.title = "Edit message";
  editBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.995.995 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>';
  editBtn.addEventListener("click", () => {
    bubbleEl.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "user-msg-content-wrap";

    const textarea = document.createElement("textarea");
    textarea.className = "user-msg-edit-area";
    textarea.value = text;
    wrap.appendChild(textarea);

    const btnRow = document.createElement("div");
    btnRow.className = "user-msg-edit-buttons";

    const saveBtn = document.createElement("button");
    saveBtn.className = "save-edit-btn";
    saveBtn.textContent = "Save & Submit";
    saveBtn.addEventListener("click", () => {
      const newVal = textarea.value.trim();
      if (!newVal) return;
      const conv = getActiveConversation();
      if (conv && conv.messages[msgIndex]) {
        conv.messages[msgIndex].text = newVal;
        // Truncate subsequent messages if editing previous conversation turns
        conv.messages = conv.messages.slice(0, msgIndex + 1);
        saveConversationsToStorage();
        loadConversation(conv.id);
        sendMessage(newVal);
      }
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      loadConversation(activeConversationId);
    });

    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);
    wrap.appendChild(btnRow);
    bubbleEl.appendChild(wrap);
    textarea.focus();
  });

  bar.appendChild(copyBtn);
  bar.appendChild(editBtn);
  return bar;
}

function buildGeneratedImageActions(imageUrl, prompt, ratio) {
  const row = document.createElement("div");
  row.className = "generated-image-actions";

  const downloadBtn = document.createElement("button");
  downloadBtn.type = "button";
  downloadBtn.innerHTML = "⬇ Download";
  downloadBtn.addEventListener("click", async () => {
    try {
      const resp = await fetch(imageUrl);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `aura-ai-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(imageUrl, "_blank");
    }
  });

  const regenBtn = document.createElement("button");
  regenBtn.type = "button";
  regenBtn.innerHTML = "↻ Regenerate";
  regenBtn.addEventListener("click", () => {
    regenerateImage(prompt, ratio);
  });

  row.appendChild(downloadBtn);
  row.appendChild(regenBtn);
  return row;
}

function ratioToDimensions(ratio) {
  switch (ratio) {
    case "16:9": return { width: 1280, height: 720 };
    case "9:16": return { width: 720, height: 1280 };
    case "4:3": return { width: 1024, height: 768 };
    case "1:1":
    default: return { width: 1024, height: 1024 };
  }
}

async function regenerateImage(prompt, ratio) {
  addTypingIndicator("Generating realistic version...");
  try {
    const { width, height } = ratioToDimensions(ratio || "1:1");
    const seed = Math.floor(Math.random() * 1000000);
    // Highly enhanced realistic prompt modifiers appended automatically for realism
    const realPrompt = `${prompt}, hyper-realistic, photorealistic, cinematic lighting, 8k resolution, highly detailed, masterclass photography`;
    const imageUrl = `${IMAGE_API}${encodeURIComponent(realPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
    await preloadImage(imageUrl);
    removeTypingIndicator();
    addMessage("assistant", `Here is your realistic generated image for: "${prompt}"`, {
      imageUrl,
      imagePrompt: prompt,
      imageRatio: ratio,
    });
  } catch (err) {
    removeTypingIndicator();
    addMessage("assistant", "Couldn't regenerate that image. Please try again.");
  }
}

function classifyFile(file) {
  const type = file.type || "";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  return "document";
}

function fileKindIcon(kind) {
  switch (kind) {
    case "video": return "🎬";
    case "audio": return "🎵";
    case "document": return "📄";
    default: return "📎";
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderFileChips() {
  if (!fileChipsContainer) return;
  fileChipsContainer.innerHTML = "";

  pendingAttachments.forEach((att) => {
    const chip = document.createElement("div");
    chip.className = "file-chip";

    if (att.kind === "image" && att.dataUrl) {
      const img = document.createElement("img");
      img.className = "file-chip-thumb";
      img.src = att.dataUrl;
      img.alt = att.file.name;
      chip.appendChild(img);
    } else {
      const iconBox = document.createElement("div");
      iconBox.className = "file-chip-icon";
      iconBox.textContent = fileKindIcon(att.kind);
      chip.appendChild(iconBox);
    }

    const name = document.createElement("span");
    name.className = "file-chip-name";
    name.textContent = `${att.file.name} · ${formatFileSize(att.file.size)}`;
    chip.appendChild(name);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      pendingAttachments = pendingAttachments.filter((a) => a.id !== att.id);
      renderFileChips();
    });
    chip.appendChild(removeBtn);
    fileChipsContainer.appendChild(chip);
  });
}

function clearAttachments() {
  pendingAttachments = [];
  renderFileChips();
  if (fileInput) fileInput.value = "";
}

function addFilesToAttachments(fileList) {
  Array.from(fileList).forEach((file) => {
    const kind = classifyFile(file);
    const att = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file, kind };
    pendingAttachments.push(att);

    if (kind === "image") {
      const reader = new FileReader();
      reader.onload = () => {
        att.dataUrl = reader.result;
        renderFileChips();
      };
      reader.readAsDataURL(file);
    }
  });
  renderFileChips();
}

if (attachBtn) {
  attachBtn.addEventListener("click", () => { if (fileInput) fileInput.click(); });
}
if (fileInput) {
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files.length) {
      addFilesToAttachments(fileInput.files);
    }
    fileInput.value = "";
  });
}

function renderAttachmentsInBubble(attachments) {
  if (!attachments || !attachments.length) return null;
  const wrap = document.createElement("div");
  wrap.className = "attached-files-in-bubble";
  attachments.forEach((att) => {
    if (att.kind === "image" && att.dataUrl) {
      const img = document.createElement("img");
      img.src = att.dataUrl;
      img.alt = att.name;
      wrap.appendChild(img);
    } else {
      const pill = document.createElement("span");
      pill.className = "attached-file-pill";
      pill.innerHTML = `${fileKindIcon(att.kind)} <span>${att.name}</span>`;
      wrap.appendChild(pill);
    }
  });
  return wrap;
}

function renderMessageBubble(role, text, extra = {}, msgIndex = 0) {
  if (!chatMessagesInner) return;
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role === "user" ? "message-user" : "message-ai"}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (role === "user") {
    const filesBlock = renderAttachmentsInBubble(extra.attachments);
    if (filesBlock) bubble.appendChild(filesBlock);
    if (text) {
      const p = document.createElement("div");
      p.textContent = text;
      bubble.appendChild(p);
    }
    wrapper.appendChild(bubble);
    wrapper.appendChild(buildUserMessageActions(wrapper, bubble, text, msgIndex));
  } else if (extra.imageUrl) {
    const img = document.createElement("img");
    img.className = "ai-generated-image";
    img.src = extra.imageUrl;
    img.alt = extra.imagePrompt || "Generated image";
    img.loading = "lazy";
    bubble.appendChild(img);
    bubble.appendChild(buildGeneratedImageActions(extra.imageUrl, extra.imagePrompt || "", extra.imageRatio));
    wrapper.appendChild(bubble);
    wrapper.appendChild(buildMessageActions(text, extra));
  } else {
    bubble.innerHTML = renderMarkdown(text);
    wrapper.appendChild(bubble);
    wrapper.appendChild(buildMessageActions(text, extra));
  }

  chatMessagesInner.appendChild(wrapper);
}

function addMessage(role, text, extra = {}) {
  const conv = getActiveConversation();
  const msgIndex = conv && conv.messages ? conv.messages.length : 0;
  renderMessageBubble(role, text, extra, msgIndex);
  scrollToBottom();

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
  wrapper.innerHTML = `<div class="bubble">${label}</div>`;
  chatMessagesInner.appendChild(wrapper);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

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
  });
}

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
  rec.onend = () => { isRecording = false; if (micBtn) micBtn.classList.remove("active"); };
  rec.onerror = () => { isRecording = false; if (micBtn) micBtn.classList.remove("active"); };
  return rec;
}

if (micBtn) {
  micBtn.addEventListener("click", () => {
    if (!recognition) recognition = initSpeechRecognition();
    if (!recognition) {
      addMessage("assistant", "Voice input isn't supported in this browser.");
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
      } catch (e) {}
    }
  });
}

if (imageGenBtn) {
  imageGenBtn.addEventListener("click", () => {
    isImageMode = !isImageMode;
    imageGenBtn.classList.toggle("active", isImageMode);
    if (imageGenBar) imageGenBar.style.display = isImageMode ? "flex" : "none";
    if (chatInput) {
      chatInput.placeholder = isImageMode ? "Describe the photorealistic image you want to generate..." : "Message Aura AI...";
    }
  });
}

if (aspectRatioGroup) {
  aspectRatioGroup.querySelectorAll(".aspect-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedAspectRatio = btn.dataset.ratio;
      aspectRatioGroup.querySelectorAll(".aspect-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
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
  addTypingIndicator("Generating photorealistic image...");
  try {
    const { width, height } = ratioToDimensions(selectedAspectRatio);
    const seed = Math.floor(Math.random() * 1000000);
    // Force hyper-realistic parameters into the image generation link
    const realPrompt = `${prompt}, highly detailed, photorealistic, 8k resolution, cinematic lighting, ultra-realistic photography`;
    const imageUrl = `${IMAGE_API}${encodeURIComponent(realPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
    await preloadImage(imageUrl);
    removeTypingIndicator();
    addMessage("assistant", `Here is your realistic image for: "${prompt}"`, {
      imageUrl,
      imagePrompt: prompt,
      imageRatio: selectedAspectRatio,
    });
  } catch (err) {
    removeTypingIndicator();
    addMessage("assistant", "Couldn't generate that image. Please try again.");
  } finally {
    isSending = false;
    if (sendBtn) sendBtn.disabled = false;
    if (chatInput) chatInput.focus();
  }
}

function ensureActiveConversation(promptText) {
  if (activeConversationId) return;
  activeConversationId = Date.now().toString();
  const titleSource = promptText || "New attachment";
  const autoTitle = titleSource.length > 25 ? titleSource.substring(0, 25) + "..." : titleSource;
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
  const userText = text.trim();
  if (!userText && pendingAttachments.length === 0) return;
  if (isSending) return;

  ensureActiveConversation(userText);

  isSending = true;
  if (sendBtn) sendBtn.disabled = true;
  if (quickPromptsContainer) quickPromptsContainer.classList.add("hidden");

  const attachmentsSnapshot = pendingAttachments.map((att) => ({
    name: att.file.name,
    kind: att.kind,
    size: att.file.size,
    dataUrl: att.kind === "image" ? att.dataUrl : undefined,
  }));
  clearAttachments();

  addMessage("user", userText, attachmentsSnapshot.length ? { attachments: attachmentsSnapshot } : {});
  renderConversationList(searchChatsInput ? searchChatsInput.value : "");
  chatInput.value = "";

  if (isImageMode) {
    if (!userText) {
      isSending = false;
      if (sendBtn) sendBtn.disabled = false;
      addMessage("assistant", "Please describe the image you'd like me to generate.");
      return;
    }
    await sendImageGenerationRequest(userText);
    return;
  }

  addTypingIndicator();

  try {
    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: userText,
        model: "groq",
        attachments: attachmentsSnapshot.map((a) => ({ name: a.name, kind: a.kind, size: a.size })),
      }),
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

const REVOKED_SHARES_KEY = "aura_revoked_shares";

function getRevokedShareIds() {
  try { return JSON.parse(localStorage.getItem(REVOKED_SHARES_KEY) || "[]"); }
  catch (e) { return []; }
}
function addRevokedShareId(id) {
  const ids = getRevokedShareIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(REVOKED_SHARES_KEY, JSON.stringify(ids));
  }
}
function removeRevokedShareId(id) {
  const ids = getRevokedShareIds().filter((x) => x !== id);
  localStorage.setItem(REVOKED_SHARES_KEY, JSON.stringify(ids));
}

function buildShareableConversation(conv) {
  return {
    id: conv.id,
    title: conv.title,
    messages: (conv.messages || []).map((m) => ({
      role: m.role,
      text: m.text || "",
      imageUrl: m.imageUrl || undefined,
      imagePrompt: m.imagePrompt || undefined,
      attachmentNames: (m.attachments || []).map((a) => a.name),
    })),
  };
}

function encodeShareData(obj) {
  const json = JSON.stringify(obj);
  return btoa(unescape(encodeURIComponent(json)));
}
function decodeShareData(str) {
  return JSON.parse(decodeURIComponent(escape(atob(str))));
}

function buildShareUrl(conv) {
  const data = encodeShareData(buildShareableConversation(conv));
  const url = new URL(window.location.href.split("#")[0]);
  url.hash = `share=${data}`;
  return url.toString();
}

function markConversationShared(conv) {
  conv.shared = true;
  removeRevokedShareId(conv.id);
  saveConversationsToStorage();
  renderConversationList(searchChatsInput ? searchChatsInput.value : "");
  if (stopShareBtn) stopShareBtn.disabled = false;
}

function openSharePopoverFor(conv) {
  if (!conv) {
    addMessage("assistant", "Start or open a chat first, then you can share it.");
    return;
  }
  currentShareConv = conv;
  const link = buildShareUrl(conv);
  if (shareLinkInput) shareLinkInput.value = link;
  if (sharePopoverTitle) sharePopoverTitle.textContent = `Share "${conv.title}"`;
  if (stopShareBtn) stopShareBtn.disabled = !conv.shared;
  if (sharePopover) sharePopover.classList.add("visible");
}

function closeSharePopover() {
  if (sharePopover) sharePopover.classList.remove("visible");
}

if (shareChatBtn) {
  shareChatBtn.addEventListener("click", () => { openSharePopoverFor(getActiveConversation()); });
}
if (closeSharePopoverBtn) closeSharePopoverBtn.addEventListener("click", closeSharePopover);

if (copyShareLinkBtn) {
  copyShareLinkBtn.addEventListener("click", () => {
    if (!shareLinkInput || !currentShareConv) return;
    navigator.clipboard.writeText(shareLinkInput.value).then(() => {
      markConversationShared(currentShareConv);
      const original = copyShareLinkBtn.textContent;
      copyShareLinkBtn.textContent = "Copied!";
      setTimeout(() => (copyShareLinkBtn.textContent = original), 1500);
    });
  });
}

if (shareWhatsappBtn) {
  shareWhatsappBtn.addEventListener("click", () => {
    if (!shareLinkInput || !currentShareConv) return;
    markConversationShared(currentShareConv);
    const text = `Check out this Aura AI chat: ${shareLinkInput.value}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  });
}

if (shareEmailBtn) {
  shareEmailBtn.addEventListener("click", () => {
    if (!shareLinkInput || !currentShareConv) return;
    markConversationShared(currentShareConv);
    const subject = encodeURIComponent(`Aura AI chat: ${currentShareConv.title}`);
    const body = encodeURIComponent(`Here's a chat from Aura AI:\n${shareLinkInput.value}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  });
}

if (shareMoreBtn) {
  shareMoreBtn.addEventListener("click", async () => {
    if (!shareLinkInput || !currentShareConv) return;
    markConversationShared(currentShareConv);
    if (navigator.share) {
      try { await navigator.share({ title: "Aura AI", url: shareLinkInput.value }); } catch (e) {}
    }
  });
}

if (stopShareBtn) {
  stopShareBtn.addEventListener("click", () => {
    if (!currentShareConv) return;
    currentShareConv.shared = false;
    addRevokedShareId(currentShareConv.id);
    saveConversationsToStorage();
    renderConversationList(searchChatsInput ? searchChatsInput.value : "");
    stopShareBtn.disabled = true;
  });
}

function renderSharedView(shareObj) {
  if (!sharedViewMessages || !sharedViewTitle || !sharedViewOverlay) return;
  const revoked = getRevokedShareIds().includes(shareObj.id);
  sharedViewTitle.textContent = shareObj.title || "Shared chat";
  sharedViewMessages.innerHTML = "";

  if (revoked) {
    const notice = document.createElement("div");
    notice.className = "conversation-empty";
    notice.textContent = "This shared chat is no longer available.";
    sharedViewMessages.appendChild(notice);
  } else {
    (shareObj.messages || []).forEach((m) => {
      const wrapper = document.createElement("div");
      wrapper.className = `message ${m.role === "user" ? "message-user" : "message-ai"}`;
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      if (m.imageUrl) {
        const img = document.createElement("img");
        img.className = "ai-generated-image";
        img.src = m.imageUrl;
        bubble.appendChild(img);
      } else if (m.role === "user") {
        bubble.textContent = m.text;
      } else {
        bubble.innerHTML = renderMarkdown(m.text || "");
      }
      wrapper.appendChild(bubble);
      sharedViewMessages.appendChild(wrapper);
    });
  }
  sharedViewOverlay.classList.add("visible");
  openInAuraBtn.style.display = revoked ? "none" : "inline-flex";
  openInAuraBtn._shareObj = shareObj;
}

function checkForSharedLinkOnLoad() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#share=")) return;
  try {
    const encoded = hash.replace("#share=", "");
    const shareObj = decodeShareData(decodeURIComponent(encoded));
    renderSharedView(shareObj);
  } catch (e) {}
}

if (closeSharedViewBtn) {
  closeSharedViewBtn.addEventListener("click", () => {
    sharedViewOverlay.classList.remove("visible");
    history.replaceState(null, "", window.location.pathname + window.location.search);
  });
}

if (openInAuraBtn) {
  openInAuraBtn.addEventListener("click", () => {
    const shareObj = openInAuraBtn._shareObj;
    if (!shareObj) return;
    const newId = `imported-${Date.now()}`;
    conversations.unshift({
      id: newId,
      title: shareObj.title || "Shared chat",
      messages: shareObj.messages || [],
      pinned: false,
      archived: false,
    });
    saveConversationsToStorage();
    sharedViewOverlay.classList.remove("visible");
    history.replaceState(null, "", window.location.pathname + window.location.search);
    loadConversation(newId);
  });
}

window.addEventListener("load", checkForSharedLinkOnLoad);
window.addEventListener("hashchange", checkForSharedLinkOnLoad);

async function startLiveAssistant() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return;
  try {
    liveStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });
    if (liveAssistantVideo) liveAssistantVideo.srcObject = liveStream;
    if (liveAssistantPanel) liveAssistantPanel.classList.add("visible");
    if (liveAssistantBtn) liveAssistantBtn.classList.add("active");
    const [track] = liveStream.getVideoTracks();
    if (track) track.addEventListener("ended", stopLiveAssistant);
  } catch (e) {}
}

function stopLiveAssistant() {
  if (liveStream) {
    liveStream.getTracks().forEach((t) => t.stop());
    liveStream = null;
  }
  if (liveAssistantVideo) liveAssistantVideo.srcObject = null;
  if (liveAssistantPanel) liveAssistantPanel.classList.remove("visible");
  if (liveAssistantBtn) liveAssistantBtn.classList.remove("active");
}

function captureScreenFrame() {
  if (!liveAssistantVideo || !liveAssistantVideo.videoWidth) return null;
  const canvas = document.createElement("canvas");
  canvas.width = liveAssistantVideo.videoWidth;
  canvas.height = liveAssistantVideo.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(liveAssistantVideo, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

if (liveAssistantBtn) {
  liveAssistantBtn.addEventListener("click", () => {
    if (liveStream) stopLiveAssistant();
    else startLiveAssistant();
  });
}
if (closeLiveAssistantBtn) closeLiveAssistantBtn.addEventListener("click", stopLiveAssistant);
if (stopLiveAssistantBtn) stopLiveAssistantBtn.addEventListener("click", stopLiveAssistant);

if (askAboutScreenBtn) {
  askAboutScreenBtn.addEventListener("click", () => {
    const dataUrl = captureScreenFrame();
    if (!dataUrl) return;
    const fakeFile = { name: `screen-${Date.now()}.png`, size: Math.round(dataUrl.length * 0.75) };
    pendingAttachments.push({ id: `${Date.now()}-screen`, file: fakeFile, kind: "image", dataUrl });
    renderFileChips();
    if (chatInput && !chatInput.value.trim()) {
      chatInput.value = "What can you tell me about what's on my screen?";
    }
    if (chatInput) chatInput.focus();
  });
}
