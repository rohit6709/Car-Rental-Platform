import { assets } from "@/assets/assets";
import Title from "@/components/owner/Title";
import { useAppContext } from "@/context/AppContext";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { socket } from "@/socket";

const ManageCars = () => {
  const { isOwner, axios, currency } = useAppContext();

  const [cars, setCars] = useState([]);

  const fetchOwnerCars = async () => {
    try {
      const { data } = await axios.get("/api/owner/cars");
      if (data.success) {
        setCars(data.cars);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const serverMessage =
        error?.response?.data?.message || error.message || "Could not load your cars";
      toast.error(serverMessage);
    }
  };

  const toggleAvailability = async (carId) => {
    try {
      const { data } = await axios.post("/api/owner/toggle-car", { carId });
      if (data.success) {
        toast.success(data.message);
        fetchOwnerCars();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const serverMessage =
        error?.response?.data?.message || error.message || "Could not update car availability";
      toast.error(serverMessage);
    }
  };

  const deleteCar = async (carId) => {
    try {
      const confirm = window.confirm(
        "Are you sure you want to delete this car?"
      );

      if (!confirm) return null;

      const { data } = await axios.post("/api/owner/delete-car", { carId });
      if (data.success) {
        toast.success(data.message);
        fetchOwnerCars();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const serverMessage =
        error?.response?.data?.message || error.message || "Could not delete your car";
      toast.error(serverMessage);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchOwnerCars();
    }
  }, []);

  // Listen for real-time car booking/availability updates
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
      // Show toast notification when car becomes available
      toast.success("Car is now available!");
    };

    socket.on("carBooked", handleCarBooked);
    socket.on("carAvailable", handleCarAvailable);

    return () => {
      socket.off("carBooked", handleCarBooked);
      socket.off("carAvailable", handleCarAvailable);
    };
  }, []);

  return (
    <div className="px-4 pt-10 md:px-10 w-full">
      <Title
        title="Manage Cars"
        subTitle="View all listed cars, update their details, or remove them from the booking platform."
      />

      <div className="max-w-3xl w-full rounded-md overflow-hidden border border-borderColor mt-6">
        <table className="w-full border-collapse text-sm sm:text-md md:text-lg  text-gray-600">
          <thead className="text-gray-500 text-left">
            <tr>
              <th className="p-3 font-medium">Car</th>
              <th className="p-3 font-medium max-md:hidden">Category</th>
              <th className="p-3 font-medium">Price</th>
              <th className="p-3 font-medium max-md:hidden">Status</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cars.map((car, index) => (
              <tr key={index} className="border-t border-borderColor">
                <td className="p-3 flex items-center gap-3">
                  <img
                    src={car.image}
                    alt="car image"
                    className="h-12 w-12 aspect-square rounded-md object-cover"
                  />
                  <div className="max-md:hidden">
                    <p className="font-medium">
                      {car.brand} {car.model}
                    </p>
                    <p className="text-xs text-gray-500">
                      {car.seating_capacity} • {car.transmission}
                    </p>
                  </div>
                </td>

                <td className="p-3 max-md:hidden">{car.category}</td>
                <td className="p-3 ">
                  {currency}
                  {car.pricePerDay}/day
                </td>

                <td className="p-3 max-md:hidden">
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      car.isAvailable
                        ? "bg-green-100 text-green-500"
                        : "bg-red-100 text-red-500"
                    }`}
                  >
                    {car.isAvailable ? "Available" : "Unavailable"}
                  </span>
                </td>

                <td className="flex items-center p-3">
                  <img
                    src={
                      car.isAvailable ? assets.eye_close_icon : assets.eye_icon
                    }
                    alt="eye icon"
                    className="cursor-pointer"
                    onClick={() => toggleAvailability(car._id)}
                  />

                  <img
                    src={assets.delete_icon}
                    alt="delete icon"
                    className="cursor-pointer"
                    onClick={() => deleteCar(car._id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageCars;
