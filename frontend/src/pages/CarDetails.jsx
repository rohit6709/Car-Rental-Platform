import { assets } from "@/assets/assets";
import Loader from "@/components/Loader";
import { useAppContext } from "@/context/AppContext";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

const CarDetails = () => {
  const { id } = useParams();
  const {
    cars,
    axios,
    currency,
    pickupDate,
    setPickupDate,
    returnDate,
    setReturnDate,
  } = useAppContext();
  const navigate = useNavigate();

  const [car, setCar] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Defensive check: ensure car has an owner before attempting to book
    if (!car?.owner) {
      toast.error("This car cannot be booked right now. Please contact support.");
      return;
    }

    try {
      const { data } = await axios.post("/api/bookings/create", {
        car: id,
        pickupDate,
        returnDate,
      });

      if (data.success) {
        toast.success(data.message);
        navigate("/my-bookings");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const serverMessage =
        error?.response?.data?.message || error.message || "Could not create your booking";
      toast.error(serverMessage);
    }
  };

  useEffect(() => {
    setCar(cars.find((car) => car._id === id));
  }, [cars, id]);

  return car ? (
    <div className="px-6 d:px-16 lg:px-24 xl:px-32 mt-16">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-6 text-gray-600"
      >
        <img
          src={assets.arrow_icon}
          alt="arrow"
          className="rotate-180 opacity-65"
        />{" "}
        Back to all cars
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        <div className="lg:col-span-2">
          <img
            src={car.image}
            alt="car image"
            className="w-full h-auto md:max-h-100 object-cover rounded-xl mb-6 shadow-md"
          />
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">
                {car.brand} {car.model}
              </h1>
              <p className="text-gray-500 text-lg">
                {car.category} • {car.year}
              </p>
            </div>
            <hr className="border-borderColor my-6" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  icon: assets.users_icon,
                  text: `${car.seating_capacity} Seats`,
                },
                { icon: assets.fuel_icon, text: car.fuel_type },
                { icon: assets.car_icon, text: car.transmission },
                { icon: assets.location_icon, text: car.location },
              ].map(({ icon, text }) => (
                <div
                  className="flex flex-col items-center bg-light p-4 rounded-lg"
                  key={text}
                >
                  <img src={icon} alt="icon" className="h-5 mb-2" />
                  {text}
                </div>
              ))}
            </div>

            {car.contact && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Owner Contact</p>
                <p className="text-2xl font-semibold text-primary">{car.contact}</p>
              </div>
            )}

            <div>
              <h1 className="text-xl font-medium mb-3">Description</h1>
              <p className="text-gray-500">{car.description}</p>
            </div>

            <div>
              <h1 className="text-xl font-medium mb-3">Features</h1>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "360 Camera",
                  "Bluetooth",
                  "GPS",
                  "Heated Seats",
                  "Rear View Mirror",
                ].map((item) => (
                  <li key={item} className="flex items-center text-gray-500">
                    <img
                      src={assets.check_icon}
                      alt="check"
                      className="h-4 mr-2"
                    />{" "}
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="shadow-lg h-max sticky top-18 rounded-xl p-6 space-y-6 text-gray-500"
        >
          <p className="flex items-center justify-between text-2xl text-gray-800 font-semibold">
            {currency}
            {car.pricePerDay}{" "}
            <span className="text-base text-gray-400 font-normal">per day</span>
          </p>

          <hr className="border-borderColor my-6" />

          <div className="flex flex-col gap-2">
            <label htmlFor="pickup-date">Pickup Date</label>
            <input
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              type="date"
              className="border border-borderColor px-3 py-2 rounded-lg"
              required
              id="pickup-date"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="return-date">Return Date</label>
            <input
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              type="date"
              className="border border-borderColor px-3 py-2 rounded-lg"
              required
              id="return-date"
            />
          </div>

          <button
            disabled={!car.isAvailable || !car.owner}
            className={`w-full transition-all py-3 font-medium rounded-xl ${
              !car.isAvailable || !car.owner
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-primary hover:bg-primary-dull text-white"
            }`}
          >
            {car.owner ? "Book Now" : "Unavailable"}
          </button>

          {!car.owner && (
            <p className="text-sm text-red-500">This listing is missing an owner and cannot be booked. Please contact support.</p>
          )}

          <p className="text-center text-sm">
            No credit card required to reserve
          </p>
        </form>
      </div>
    </div>
  ) : (
    <Loader />
  );
};

export default CarDetails;
