import { io } from "socket.io-client";
import server from "../environment.js";

// Create Socket.IO client instance
const socket = io(server, {
  transports: ["websocket", "polling"],
  autoConnect: false, // Don't connect automatically
});

// Connection event handlers
socket.on("connect", () => {
  console.log("✅ Connected to server");
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected from server");
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error);
});

export default socket; 