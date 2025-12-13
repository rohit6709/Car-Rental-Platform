import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { socket } from "@/socket";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const navigate = useNavigate();
  const currency = import.meta.env.VITE_CURRENCY;

  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

  const [cars, setCars] = useState([]);

  const fetchUser = async () => {
    try {
      const { data } = await axios.get("/api/user/data");
      if (data.success) {
        setUser(data.user);
        setIsOwner(data.user.role === "owner");
      } else {
        navigate("/");
      }
    } catch (error) {
      const serverMessage =
        error?.response?.data?.message || error.message || "Could not load user profile";
      toast.error(serverMessage);
    }
  };

  const fetchCars = async () => {
    try {
      const { data } = await axios.get("/api/user/cars");
      if (data.success) {
        const validCars = (data.cars || []).filter(car => car && car._id);
        setCars(validCars);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const serverMessage =
        error?.response?.data?.message || error.message || "Could not load cars";
      toast.error(serverMessage);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setIsOwner(false);
    axios.defaults.headers.common["Authorization"] = "";
    toast.success("You have logged out successfully");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    setToken(token);
    fetchCars();
  }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `${token}`;
      fetchUser();
    }
  }, [token]);

  useEffect(() => {
    const handleCarBooked = ({ carId }) => {
      setCars((prevCars) =>
        prevCars.map((car) =>
          car._id === carId ? { ...car, isAvailable: false } : car
        )
      );
    };

    const handleCarAvailable = ({ carId }) => {
      setCars((prevCars) =>
        prevCars.map((car) =>
          car._id === carId ? { ...car, isAvailable: true } : car
        )
      );
    };

    const handleCarAdded = ({ car }) => {
      setCars((prevCars) => [car, ...prevCars]);
    };

    const handleCarRemoved = ({ carId }) => {
      setCars((prevCars) => prevCars.filter((c) => String(c._id ?? c.id) !== String(carId)));
    };

    socket.on("carBooked", handleCarBooked);
    socket.on("carAvailable", handleCarAvailable);
    socket.on("carAdded", handleCarAdded);
    socket.on("carRemoved", handleCarRemoved);

    return () => {
      socket.off("carBooked", handleCarBooked);
      socket.off("carAvailable", handleCarAvailable);
      socket.off("carAdded", handleCarAdded);
      socket.off("carRemoved", handleCarRemoved);
    };
  }, []);

  const value = {
    navigate,
    currency,
    axios,
    user,
    setUser,
    token,
    setToken,
    isOwner,
    setIsOwner,
    fetchUser,
    showLogin,
    setShowLogin,
    logout,
    fetchCars,
    cars,
    setCars,
    pickupDate,
    setPickupDate,
    returnDate,
    setReturnDate,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  return useContext(AppContext);
};
