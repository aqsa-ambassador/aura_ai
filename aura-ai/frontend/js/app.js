/**
 * Aura AI — Frontend logic
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
const themeToggle = document.getElementById("theme-toggle");
const yearEl = document.getElementById("year");

let isSending = false;
let activeConversationId = null;
let conversations = [];

if (yearEl) yearEl.textContent = new Date().getFullYear();

// Theme toggle
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
      console.error("Storage error", e);
    }
  }
}

window.addEventListener("load", () => {
  loadConversationsFromStorage();
});

// Clean Markdown & Table Parser
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

function addMessage(role, text) {
  if (!chatWindow) return;
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role === "user" ? "message-user" : "message-ai"}`;

  const avatar = document.createElement("div");
  avatar.className = `avatar ${role === "user" ? "avatar-user" : "avatar-ai"}`;
  avatar.innerHTML = role === "user" ? "👤" : "✨";

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
  scrollToBottom();
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
  }

  const userText = text.trim();
  let activeConv = conversations.find((c) => c.id === activeConversationId);
  if (!activeConv) {
    const autoTitle = userText.length > 25 ? userText.substring(0, 25) + "..." : userText;
    activeConv = { id: activeConversationId, title: autoTitle };
    conversations.unshift(activeConv);
    saveConversationsToStorage();
    if (headerTitle) headerTitle.textContent = autoTitle;
  }

  isSending = true;
  if (sendBtn) sendBtn.disabled = true;

  addMessage("user", userText);
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
