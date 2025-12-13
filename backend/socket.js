import { Server } from "socket.io";

let io;

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
}

export function emitCarBooked(carId) {
  if (!io) {
    console.error("Socket.io not initialized");
    return;
  }
  io.emit("carBooked", { carId: String(carId) });
}

export function emitCarAvailable(carId) {
  if (!io) return;
  io.emit("carAvailable", { carId: String(carId) });
}

export function emitBookingStatusChanged(bookingId, status) {
  if (!io) return;
  io.emit("bookingStatusChanged", { bookingId: String(bookingId), status });
}

export function emitCarAdded(car) {
  if (!io) return;
  io.emit("carAdded", { car });
}

export function emitCarRemoved(carId) {
  if (!io) return;
  io.emit("carRemoved", { carId: String(carId) });
}

