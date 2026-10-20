const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");

const server = http.createServer((req, res) => {
  let url = req.url === "/" ? "/index.html" : req.url;
  let filePath = path.join(__dirname, "public", url);
  let ext = path.extname(filePath);
  let types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Файл не найден");
      return;
    }
    res.writeHead(200, { "Content-Type": types[ext] || "text/plain" });
    res.end(data);
  });
});
const wss = new WebSocket.Server({ server });
const users = new Map();
function send(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}
function broadcast(obj, except) {
  for (const client of wss.clients) {
    if (client !== except) send(client, obj);
  }
}
function sendUserList() {
  const list = [];
  for (const user of users.values()) {
    list.push({ name: user.name, color: user.color });
  }
  broadcast({ type: "users", users: list });
}

wss.on("connection", (ws) => {
  console.log("Кто-то подключился");

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (msg.type === "join") {
      const name = String(msg.name || "").trim();
      if (!name) return;

      users.set(ws, { name: name, color: msg.color || "#000000" });
      const others = [];
      for (const [client, user] of users) {
        if (client !== ws) others.push(user.name);
      }
      if (others.length === 0) {
        send(ws, { type: "system", text: "Добро пожаловать. Вы первый в чате." });
      } else {
        send(ws, {
          type: "system",
          text: "Добро пожаловать. В чате уже присутствуют: " + others.join(", ") + ".",
        });
      }
      broadcast({ type: "system", text: "К нам присоединился " + name }, ws);
      sendUserList();
      return;
    }
    const user = users.get(ws);
    if (!user) return;
    if (msg.type === "message") {
      broadcast({
        type: "message",
        from: user.name,
        color: user.color,
        text: msg.text,
      });
    }
    if (msg.type === "private") {
      let target = null;
      for (const [client, u] of users) {
        if (u.name === msg.to) {
          target = client;
          break;
        }
      }
      if (!target) return;
      send(target, {
        type: "private",
        from: user.name,
        color: user.color,
        text: msg.text,
      });
      send(ws, {
        type: "private",
        from: user.name,
        color: user.color,
        text: msg.text,
        to: msg.to,
      });
    }
  });
  ws.on("close", () => {
    const user = users.get(ws);
    if (user) {
      users.delete(ws);
      broadcast({ type: "system", text: user.name + " нас покинул." });
      sendUserList();
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log("Сервер запущен: http://localhost:" + PORT);
});
