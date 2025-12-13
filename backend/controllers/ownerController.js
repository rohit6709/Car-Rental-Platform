import imagekit from "../configs/imagekit.js";
import Booking from "../models/Booking.js";
import Car from "../models/car.js";
import User from "../models/User.js";
import fs from "fs";
import { emitCarBooked , emitCarAvailable, emitCarAdded, emitCarRemoved } from "../socket.js";

export const changeRoleToOwner = async (req, res) => {
  try {
    const { _id } = req.user;
    await User.findByIdAndUpdate(_id, { role: "owner" });
    res.status(200).json({ success: true, message: "You are now a car owner! You can list your cars" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Could not change your role. Please try again" });
  }
};

export const addCar = async (req, res) => {
  try {
    const { _id } = req.user;
    if (!req.body?.carData) {
      return res
        .status(400)
        .json({ success: false, message: "Please fill in all car details" });
    }

    let car;
    try {
      car = JSON.parse(req.body.carData);
    } catch (err) {
      return res
        .status(400)
        .json({ success: false, message: "Car details format is invalid. Please refresh and try again" });
    }

    const imageFile = req.file;
    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: "Please upload a car photo",
      });
    }

    // upload image to Imagekit
    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(imageFile.path);
    } catch (err) {
      console.error("Failed to read uploaded file:", err.message);
      return res.status(500).json({
        success: false,
        message: "Could not process the image. Please try uploading a different photo",
      });
    }
    let response;
    try {
      response = await imagekit.upload({
        file: fileBuffer,
        fileName: imageFile.originalname,
        folder: "/cars",
      });
    } catch (err) {
      console.error("ImageKit upload failed:", err);
      return res.status(502).json({
        success: false,
        message: "Could not upload the car photo. Please check your internet connection and try again",
      });
    }

    // optimize through imagekit URL transformation
    const optimizedImageUrl = imagekit.url({
      path: response.filePath,
      transformation: [
        { width: "1280" }, //* width resizing
        { quality: "auto" }, //* Auto compression
        { format: "webp" }, //* convert to modern format
      ],
    });

    const image = optimizedImageUrl;

    const newCar = await Car.create({ ...car, owner: _id, image });

    // Emit real-time event so all connected clients see the new car immediately
    emitCarAdded(newCar);

    res.status(200).json({ success: true, message: "Your car has been listed successfully!" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Could not add your car. Please try again" });
  }
};

export const getOwnerCars = async (req, res) => {
  try {
    const { _id } = req.user;
    const cars = await Car.find({ owner: _id });

    res.status(200).json({ success: true, cars });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Could not load your cars. Please try again" });
  }
};

export const toggleCarAvailability = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.body;
    const car = await Car.findById(carId);

    if (car?.owner?.toString() !== _id.toString()) {
      return res.status(401).json({ success: false, message: "You don't have permission to change this car" });
    }

    car.isAvailable = !car.isAvailable;

    await car?.save();

    if (!car.isAvailable) {
      // car is now unavailable → remove from Cars page immediately
      emitCarBooked(car._id);
    } else {
      // car is now available again → show again in Cars page instantly
      emitCarAvailable(car._id);
    }

    res.status(200).json({
      success: true,
      message: car.isAvailable ? "Your car is now available for booking" : "Your car is no longer available",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Could not update car availability. Please try again" });
  }
};

export const deleteCar = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.body;
    const car = await Car.findById(carId);

    if (car?.owner?.toString() !== _id.toString()) {
      return res.status(401).json({ success: false, message: "You don't have permission to delete this car" });
    }

    // Delete all bookings associated with this car
    await Booking.deleteMany({ car: carId });

    // Delete the car itself
    await Car.findByIdAndDelete(carId);

    // Notify clients to remove this car from listings immediately
    emitCarRemoved(carId);

    res
      .status(200)
      .json({ success: true, message: "Your car and all associated bookings have been removed" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Could not delete your car. Please try again" });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const { _id, role } = req.user;

    if (role !== "owner") {
      return res.status(401).json({ success: false, message: "Only car owners can view the dashboard" });
    }

    const cars = await Car.find({ owner: _id });
    const bookings = await Booking.find({ owner: _id })
      .populate({
        path: "car",
        select: "brand model image",
        strictPopulate: false
      })
      .sort({ createdAt: -1 });

    const pendingBookings = await Booking.find({
      owner: _id,
      status: "pending",
    });
    const completedBookings = await Booking.find({
      owner: _id,
      status: "confirmed",
    });

    //* Calculate Monthly Revenue
    const monthlyRevenue = bookings
      .slice()
      .filter((booking) => booking.status === "confirmed")
      .reduce((acc, booking) => acc + booking.price, 0);

    const dashboardData = {
      totalCars: cars.length,
      totalBookings: bookings.length,
      pendingBookings: pendingBookings.length,
      completedBookings: completedBookings.length,
      recentBookings: bookings.slice(0, 3),
      monthlyRevenue,
    };

    res.status(200).json({ success: true, dashboardData });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Could not load dashboard. Please try again" });
  }
};

//* to update user image
export const updateUserImage = async (req, res) => {
  try {
    const { _id } = req.user;

    const imageFile = req.file;

    //* upload image to Imagekit
    const fileBuffer = fs.readFileSync(imageFile.path);
    let response;
    try {
      response = await imagekit.upload({
        file: fileBuffer,
        fileName: imageFile.originalname,
        folder: "/users",
      });
    } catch (err) {
      console.error("ImageKit upload failed:", err);
      return res.status(502).json({
        success: false,
        message: "Could not upload your profile photo. Please check your internet connection and try again",
      });
    }

    //* optimize through imagekit URL transformation
    const optimizedImageUrl = imagekit.url({
      path: response.filePath,
      transformation: [
        { width: "400" }, //* width resizing
        { quality: "auto" }, //* Auto compression
        { format: "webp" }, //* convert to modern format
      ],
    });

    const image = optimizedImageUrl;

    await User.findByIdAndUpdate(_id, { image });

    res
      .status(200)
      .json({ success: true, message: "Your profile photo has been updated!" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Could not update your profile photo. Please try again" });
  }
};
