import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./configs/db.js";
import userRouter from "./routes/userRoutes.js";
import ownerRouter from "./routes/ownerRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import { initSocket, emitCarAvailable } from "./socket.js";
import Booking from "./models/Booking.js";
import Car from "./models/car.js";
import http from "http";

const app = express();

await connectDB();

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());

app.get("/", (req, res) => res.send("Server is running"));
app.use("/api/user", userRouter);
app.use("/api/owner", ownerRouter);
app.use("/api/bookings", bookingRouter);

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
initSocket(server);

const checkExpiredBookings = async () => {
  try {
    const now = new Date();
    
    const expiredBookings = await Booking.find({
      status: "confirmed",
      returnDate: { $lte: now },
    });

    for (const booking of expiredBookings) {
      await Booking.updateOne({ _id: booking._id }, { $set: { status: "completed" } });

      const car = await Car.findById(booking.car);
      if (car) {
        car.isAvailable = true;
        await car.save();

        emitCarAvailable(car._id);
      }
    }
  } catch (error) {
    console.error("Error checking expired bookings:", error);
  }
};

setInterval(checkExpiredBookings, 60 * 60 * 1000);

checkExpiredBookings();

server.listen(PORT, () =>
  console.log(`Server is running on port ${PORT}`)
);
