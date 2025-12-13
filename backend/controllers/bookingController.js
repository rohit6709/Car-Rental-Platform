import Booking from "../models/Booking.js";
import Car from "../models/car.js";
import { emitCarBooked , emitCarAvailable, emitBookingStatusChanged } from "../socket.js";

const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed"];
const checkAvailability = async (car, pickupDate, returnDate) => {
  const booking = await Booking.findOne({
    car,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    pickupDate: { $lte: returnDate },
    returnDate: { $gte: pickupDate },
  });

  return booking === null;
};

export const checkAvailabilityOfCar = async (req, res) => {
  try {
    const { location, pickupDate, returnDate } = req.body;

    const cars = await Car.find({ location, isAvailable: true });

    const availableCarsPromises = cars.map(async (car) => {
      const isAvailable = await checkAvailability(
        car._id,
        pickupDate,
        returnDate
      );
      return { ...car._doc, isAvailable: isAvailable };
    });

    let availableCars = await Promise.all(availableCarsPromises);
    availableCars = availableCars.filter((car) => car.isAvailable === true);

    res.status(200).json({ success: true, availableCars });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "Could not search for cars. Please try again" });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { _id } = req.user;
    const { car, pickupDate, returnDate } = req.body;

    const isAvailable = await checkAvailability(car, pickupDate, returnDate);
    if (!isAvailable) {
      return res.json({
        success: false,
        message: "This car is not available for your selected dates. Please choose different dates",
      });
    }

    const carData = await Car.findById(car);
    if (!carData) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    if (!carData.owner) {
      return res.status(400).json({ success: false, message: "This car is not available for booking (owner missing). Please contact support." });
    }

    const picked = new Date(pickupDate);
    const returned = new Date(returnDate);
    let noOfDays = Math.ceil((returned - picked) / (1000 * 60 * 60 * 24));
    if (noOfDays === 0) {
      noOfDays = 1;
    }
    const price = carData.pricePerDay * noOfDays;

    const newBooking = await Booking.create({
      car,
      owner: carData.owner,
      user: _id,
      pickupDate,
      returnDate,
      price,
      status: "pending",
    });

    carData.isAvailable = false;
    await carData.save();

    emitCarBooked(carData._id);

    return res.status(200).json({
      success: true,
      message: "Booking request sent! The car owner will confirm your booking soon.",
      booking: newBooking,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "Could not create your booking. Please try again" });
  }
};



export const getUserBookings = async (req, res) => {
  try {
    const { _id } = req.user;
    const bookings = await Booking.find({ user: _id })
      .populate({
        path: "car",
        select: "brand model image year category location price",
        strictPopulate: false
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "Could not load your bookings. Please try again" });
  }
};

export const getOwnerBookings = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(401).json({ success: false, message: "Only car owners can view booking requests" });
    }

    const bookings = await Booking.find({ owner: req.user._id })
      .populate([
        {
          path: "car",
          select: "brand model image year category location price",
          strictPopulate: false
        },
        {
          path: "user",
          select: "-password"
        }
      ])
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "Could not load booking requests. Please try again" });
  }
};

export const changeBookingStatus = async (req, res) => {
  try {
    const { _id } = req.user;
    const { bookingId, status } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.owner.toString() !== _id.toString()) {
      return res.status(401).json({ success: false, message: "You can only change your own bookings" });
    }

    const allowedStatuses = ["pending", "confirmed", "cancelled"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid status: pending, confirmed, or cancelled",
      });
    }

    booking.status = status;
    await booking.save();

    const carId = booking.car;
    const car = await Car.findById(carId);
    if (car) {
      if (status === "confirmed") {
        car.isAvailable = false;
        await car.save();

        emitCarBooked(car._id);
      } else if (status === "cancelled") {
        car.isAvailable = true;
        await car.save();

        emitCarAvailable(car._id);
      }
    }

    emitBookingStatusChanged(bookingId, status);

    return res.status(200).json({ success: true, message: "Booking status has been updated" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, message: "Could not update booking status. Please try again" });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { _id } = req.user;
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: "We couldn't find this booking" });
    }

    if (
      booking.user.toString() !== _id.toString() &&
      booking.owner.toString() !== _id.toString()
    ) {
      return res.status(401).json({ success: false, message: "You don't have permission to cancel this booking" });
    }

    booking.status = "cancelled";
    await booking.save();

    const car = await Car.findById(booking.car);
    if (car) {
      car.isAvailable = true;
      await car.save();

      emitCarAvailable(car._id);
    }

    return res.status(200).json({
      success: true,
      message: "Your booking has been cancelled",
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      success: false,
      message: "Could not cancel your booking. Please try again",
    });
  }
};
