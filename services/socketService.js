let io;

// userId -> socketId
const onlineUsers = new Map();

const initSocket = (server) => {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("register_user", ({ userId }) => {
      if (!userId) return;

      onlineUsers.set(userId, socket.id);
      socket.userId = userId;

      console.log(`User registered: ${userId} -> ${socket.id}`);
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        console.log(`User disconnected: ${socket.userId}`);
      }
    });
  });

  return io;
};

const sendAIResponseToUser = ({ userId, response }) => {
  if (!io) {
    console.log("Socket.io not initialized");
    return false;
  }

  const socketId = onlineUsers.get(userId);

  if (!socketId) {
    console.log("User is not connected:", userId);
    return false;
  }

  io.to(socketId).emit("ai_response", {
    userId,
    response,
    created_at: new Date()
  });

  return true;
};

module.exports = {
  initSocket,
  sendAIResponseToUser
};