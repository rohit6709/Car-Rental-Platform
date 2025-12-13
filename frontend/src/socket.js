import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_BASE_URL;
export const socket = io(BASE_URL, { transports: ["websocket"] });

socket.on("connect", () => {
  console.log("Socket connected:", socket.id, "to", BASE_URL);
});
socket.on("connect_error", (err) => {
  console.error("Socket connect_error:", err);
});
