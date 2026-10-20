// --- элементы страницы ---
const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");
const nameInput = document.getElementById("name-input");
const colorInput = document.getElementById("color-input");
const joinBtn = document.getElementById("join-btn");
const loginError = document.getElementById("login-error");

const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const userListEl = document.getElementById("user-list");
let ws = null;
let myName = "";
let privateTarget = null;

function addSystemMessage(text) {
  const div = document.createElement("div");
  div.className = "system-message";
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addMessage(prefix, text, color, isPrivate) {
  const div = document.createElement("div");
  div.className = "message";
  div.textContent = (isPrivate ? "[ЛС] " : "") + prefix + ": " + text;
  div.style.color = color || "#000";
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function join() {
  const name = nameInput.value.trim();
  if (!name) {
    loginError.textContent = "Введите имя!";
    return;
  }
  loginError.textContent = "";
  const color = colorInput.value;

  ws = new WebSocket("ws://" + location.host);

  ws.onopen = () => {
    myName = name;
    ws.send(JSON.stringify({ type: "join", name: name, color: color }));
    loginScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
    messageInput.focus();
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "system") {
      addSystemMessage(msg.text);
    } else if (msg.type === "message") {
      addMessage(msg.from, msg.text, msg.color, false);
    } else if (msg.type === "private") {
      if (msg.to) {
        addMessage("Вы -> " + msg.to, msg.text, msg.color, true);
      } else {
        addMessage(msg.from, msg.text, msg.color, true);
      }
    } else if (msg.type === "users") {
      userListEl.innerHTML = "";
      for (const user of msg.users) {
        const li = document.createElement("li");
        li.textContent = user.name + (user.name === myName ? " (вы)" : "");
        li.style.color = user.color;
        li.onclick = () => {
          if (user.name === myName) return;
          privateTarget = user.name;
          messageInput.placeholder = "Сообщение для " + user.name + " (Esc — отмена)";
          messageInput.focus();
        };
        userListEl.appendChild(li);
      }
    }
  };

  ws.onclose = () => {
    addSystemMessage("Соединение с сервером закрыто.");
  };
}
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !ws) return;

  if (privateTarget) {
    ws.send(
      JSON.stringify({
        type: "private",
        to: privateTarget,
        text: text,
      }),
    );
    privateTarget = null;
    messageInput.placeholder = "Введите сообщение...";
  } else {
    ws.send(JSON.stringify({ type: "message", text: text }));
  }
  messageInput.value = "";
}
joinBtn.onclick = join;

nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") join();
});

sendBtn.onclick = sendMessage;

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  } else if (e.key === "Escape") {
    privateTarget = null;
    messageInput.placeholder = "Введите сообщение...";
  }
});
