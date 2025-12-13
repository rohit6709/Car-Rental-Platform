import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Car from "../models/car.js";

const generateToken = (userId) => {
  const payload = userId;
  return jwt.sign(payload, process.env.JWT_SECRET);
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Please fill in your name, email, and password" });
    }
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Your password must be at least 8 characters long",
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .json({ success: false, message: "This email is already registered. Please use a different email or log in" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = generateToken(user._id.toString());

    res.status(200).json({
      success: true,
      name: user.name,
      email: user.email,
      token,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Something went wrong during signup. Please try again" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "We couldn't find an account with this email" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Your email or password is incorrect. Please try again" });
    }

    const token = generateToken(user._id.toString());

    res.status(200).json({
      success: true,
      name: user.name,
      email: user.email,
      token,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Something went wrong during login. Please try again" });
  }
};

export const getUserData = async (req, res) => {
  try {
    const { user } = req;
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Could not load your profile. Please try again" });
  }
};

export const getCars = async (req, res) => {
  try {
    const cars = await Car.find({ isAvailable: true });

    res.status(200).json({ success: true, cars });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Could not load cars. Please refresh and try again" });
  }
};
