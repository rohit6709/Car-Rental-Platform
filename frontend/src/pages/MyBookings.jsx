import { assets } from "@/assets/assets";
import Title from "@/components/Title";
import { useAppContext } from "@/context/AppContext";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { socket } from "@/socket";

const MyBookings = () => {
  const { axios, user, currency } = useAppContext();

  const [bookings, setBookings] = useState([]);

  const fetchMyBookings = async () => {
    try {
      const { data } = await axios.get("/api/bookings/user");
      if (data.success) {
        setBookings(data.bookings);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const serverMessage =
        error?.response?.data?.message || error.message || "Could not load your bookings";
      toast.error(serverMessage);
    }
  };

  useEffect(() => {
    user && fetchMyBookings();
  }, [user]);

  // Listen for real-time booking status updates
  useEffect(() => {
    const handleBookingStatusChanged = ({ bookingId, status }) => {
      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking._id === bookingId ? { ...booking, status } : booking
        )
      );
    };

    socket.on("bookingStatusChanged", handleBookingStatusChanged);

    return () => {
      socket.off("bookingStatusChanged", handleBookingStatusChanged);
    };
  }, []);

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-32 2xl:px-48 mt-16 text-sm max-w-7xl">
      <Title
        title="My Bookings"
        subtitle="View and manage your all car bookings"
        align="left"
      />

      <div>
        {bookings.map((booking, index) => (
          booking.car ? (
            <div
              key={booking._id}
              className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border border-borderColor rounded-lg mt-5 first:mt-12"
            >
              <div className="md:col-span-1">
                <div className="rounded-md overflow-hidden mb-3">
                  <img
                    src={booking.car.image}
                    alt="car"
                    className="w-full h-auto aspect-video object-cover"
                  />
                </div>
                <p className="text-lg font-medium mt-3">
                  {booking.car.brand} {booking.car.model}
                </p>
                <p className="text-gray-500">
                  {booking.car.year} • {booking.car.category} •{" "}
                  {booking.car.location}
                </p>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center gap-2">
                  <p className="px-3 py-1.5 bg-light rounded">
                    Booking #{index + 1}
                  </p>
                  <p
                    className={`px-3 py-1 text-xs rounded-full ${
                      booking.status === "confirmed"
                        ? "bg-green-400/15 text-green-600"
                        : "bg-red-400/15 text-red-600"
                    }`}
                  >
                    {booking.status}
                  </p>
                </div>

                <div className="flex items-start gap-2 mt-3">
                  <img
                    src={assets.calendar_icon_colored}
                    alt="calendar"
                    className="w-4 h-4 mt-1"
                  />
                  <div>
                    <p className="text-gray-500">Rental Period</p>
                    <p>
                      {booking.pickupDate.split("T")[0]} To{" "}
                      {booking.returnDate.split("T")[0]}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 mt-3">
                  <img
                    src={assets.location_icon_colored}
                    alt="calendar"
                    className="w-4 h-4 mt-1"
                  />
                  <div>
                    <p className="text-gray-500">Pick-up Location</p>
                    <p>{booking.car.location}</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-1 flex flex-col justify-between gap-6">
                <div className="text-sm text-gray-500 text-right">
                  <p>Total Price</p>
                  <h1 className="text-2xl font-semibold text-primary">
                    {currency}
                    {booking.price}
                  </h1>
                  <p>Booked on {booking.createdAt.split("T")[0]}</p>
                </div>
              </div>
            </div>
          ) : (
            <div
              key={booking._id}
              className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border border-borderColor rounded-lg mt-5 first:mt-12 bg-gray-50"
            >
              <div className="md:col-span-2">
                <p className="text-lg font-medium text-gray-500">Car Deleted</p>
                <p className="text-sm text-gray-400 mt-2">This car is no longer available</p>
              </div>
              <div className="md:col-span-1 flex items-center">
                <p
                  className={`px-3 py-1 text-xs rounded-full ${
                    booking.status === "confirmed"
                      ? "bg-green-400/15 text-green-600"
                      : "bg-red-400/15 text-red-600"
                  }`}
                >
                  {booking.status}
                </p>
              </div>
              <div className="md:col-span-1 text-right text-sm text-gray-500">
                <p>Total Price</p>
                <h1 className="text-2xl font-semibold text-primary">
                  {currency}
                  {booking.price}
                </h1>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default MyBookings;
