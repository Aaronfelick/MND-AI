const BOT_NAME = "SwiftFreight Assistant";
const BOT_AVATAR = "SF";
const HEADER_SUBTITLE = "Ask me anything about our services";
const WELCOME_MESSAGE =
  "Hi! I'm the SwiftFreight Assistant. I can help with shipping rates, delivery times, booking, customs, and more. What would you like to know?";

const SUGGESTED_QUESTIONS = [
  "What are your air freight rates?",
  "How do I book a shipment?",
  "How long does delivery to Riyadh take?",
  "Rate for 300kg sea freight open top?"
];

const API_URL = window.location.protocol === "file:"
  ? "http://localhost:3000/api/chat"
  : "/api/chat";

const chatBody = document.getElementById("chatBody");
const suggestions = document.getElementById("suggestions");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

let chatHistory = [];

function addBubble(role, text, id) {
  const row = document.createElement("div");
  row.className = "bubble-row" + (role === "user" ? " user" : "");
  if (id) row.id = id;

  if (role !== "user") {
    const avatar = document.createElement("div");
    avatar.className = "mini-avatar";
    avatar.textContent = BOT_AVATAR;
    row.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble " + (role === "user" ? "user" : role === "typing" ? "typing" : "bot");
  bubble.textContent = text;
  row.appendChild(bubble);

  chatBody.appendChild(row);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function showSuggestions(questions) {
  suggestions.innerHTML = "";

  questions.forEach((question) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.textContent = question;
    chip.addEventListener("click", () => {
      suggestions.innerHTML = "";
      chatInput.value = question;
      sendMessage();
    });
    suggestions.appendChild(chip);
  });
}

function setBusy(isBusy) {
  sendBtn.disabled = isBusy;
  chatInput.disabled = isBusy;
}

async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message || sendBtn.disabled) return;

  chatInput.value = "";
  suggestions.innerHTML = "";
  setBusy(true);

  addBubble("user", message);
  chatHistory.push({ role: "user", content: message });

  const typingId = "typing-" + Date.now();
  addBubble("typing", "Typing...", typingId);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || `Server returned ${response.status}`);
    }

    const reply = payload.reply || "Sorry, I couldn't get a response. Please try again.";
    document.getElementById(typingId)?.remove();
    addBubble("bot", reply);
    chatHistory.push({ role: "assistant", content: reply });
  } catch (error) {
    document.getElementById(typingId)?.remove();
    addBubble(
      "bot",
      "Connection error. Please make sure the backend server is running and try again."
    );
    console.error("BizBot error:", error);
  } finally {
    setBusy(false);
    chatInput.focus();
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});

document.getElementById("headerName").textContent = BOT_NAME;
document.getElementById("headerAvatar").textContent = BOT_AVATAR;
document.getElementById("headerSub").textContent = HEADER_SUBTITLE;

showSuggestions(SUGGESTED_QUESTIONS);
addBubble("bot", WELCOME_MESSAGE);
