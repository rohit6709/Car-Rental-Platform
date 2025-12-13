import { assets } from "@/assets/assets";
import CarCard from "@/components/CarCard";
import Title from "@/components/Title";
import { useAppContext } from "@/context/AppContext";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { socket } from "@/socket";

const Cars = () => {
  const [searchParams] = useSearchParams();

  const pickupLocation = searchParams.get("pickupLocation");
  const pickupDate = searchParams.get("pickupDate");
  const returnDate = searchParams.get("returnDate");

  const { cars, setCars, axios , fetchCars } = useAppContext();

  const [input, setInput] = useState("");
  const [filteredCars, setFilteredCars] = useState([]);

  const isSearchData = pickupLocation && pickupDate && returnDate;

const applyFilter = useCallback(async () => {
  if (input === "") {
    setFilteredCars(cars);
    return;
  }

  const q = input.toLocaleLowerCase();
  const filtered = cars.slice().filter((car) => {
    return (
      (car.brand || "").toLowerCase().includes(q) ||
      (car.model || "").toLowerCase().includes(q) ||
      (car.category || "").toLowerCase().includes(q) ||
      (car.transmission || "").toLowerCase().includes(q)
    );
  });

  setFilteredCars(filtered);
}, [cars, input]);

  const searchCarAvailability = useCallback(async () => {
  try {
    const { data } = await axios.post("/api/bookings/check-availability", {
      location: pickupLocation,
      pickupDate,
      returnDate,
    });
    if (data.success) {
      setFilteredCars(data.availableCars);
      if (data.availableCars.length === 0) {
        toast("No cars available for selected dates");
      }
    }
  } catch (err) {
    console.error("searchCarAvailability error:", err);
    toast.error("Failed to search cars. Try again.");
  }
}, [axios, pickupLocation, pickupDate, returnDate]);

const refreshCars = useCallback(async () => {
  if (isSearchData) {
    await searchCarAvailability();
  } else {
    await applyFilter();
  }
}, [isSearchData, searchCarAvailability, applyFilter]);

  useEffect(() => {
  if (isSearchData) {
    searchCarAvailability();
  } else {
    applyFilter();
  }
}, [isSearchData, searchCarAvailability, applyFilter]);


  useEffect(() => {
  if (!isSearchData) {
    applyFilter();
  }
}, [cars, input, isSearchData, applyFilter]);



  useEffect(() => {
  const handleBooked = (payload) => {
    console.log("SOCKET: carBooked ->", payload);
    const carId = String(payload?.carId ?? payload);

    // update global context - mark car as unavailable instead of removing
    setCars(prev => prev.map(c => 
      String(c._id ?? c.id) === carId ? { ...c, isAvailable: false } : c
    ));

    // update local view
    setFilteredCars(prev => prev.filter(car => String(car._id ?? car.id) !== carId));

    // if searching by dates, re-check availability for those dates
    if (isSearchData) {
      searchCarAvailability().catch(err => console.error("searchCarAvailability err:", err));
    }
  };

  const handleAvailable = (payload) => {
    console.log("SOCKET: carAvailable ->", payload);
    const carId = String(payload?.carId ?? payload);
    
    // update global context - mark car as available
    setCars(prev => prev.map(c => 
      String(c._id ?? c.id) === carId ? { ...c, isAvailable: true } : c
    ));
    
    // refresh filtered view
    refreshCars().catch(err => console.error("refreshCars error:", err));
  };

  socket.on("carBooked", handleBooked);
  socket.on("carAvailable", handleAvailable);

  return () => {
    socket.off("carBooked", handleBooked);
    socket.off("carAvailable", handleAvailable);
  };
}, [isSearchData, refreshCars, searchCarAvailability, setCars]);


  return (
    <div>
      <div className="flex flex-col items-center py-20 bg-light max-md:px-4">
        <Title
          title="Available Cars"
          subtitle="Browse our selection of premium vehicles available for your next adventure"
        />
        <div className="flex items-center bg-white px-4 mt-6 max-w-140 w-full h-12 rounded-full shadow">
          <img
            src={assets.search_icon}
            alt="search"
            className="w-4.5 h-4.5 mr-2"
          />
          <input
            onChange={(e) => setInput(e.target.value)}
            type="text"
            placeholder="Search by make, model or features"
            className="w-full h-full outline-none text-gray-500"
            value={input}
          />
          <img
            src={assets.filter_icon}
            alt="filter"
            className="w-4.5 h-4.5 ml-2"
          />
        </div>
      </div>

      <div className="px-6 md:px-16 lg:px-24 xl:px-32 mt-10">
        <p className="text-gray-500 xl:px-20 max-w-7xl mx-auto">
          Showing {filteredCars.length} Cars
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-4 xl:px-20 max-w-7xl mx-auto">
          {filteredCars.map((car) => (
            <div key={car._id ?? car.id}>
              <CarCard car={car} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Cars;
