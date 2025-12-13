import Title from "@/components/owner/Title";
import { useAppContext } from "@/context/AppContext";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { socket } from "@/socket";

const ManageBookings = () => {
  const { currency, axios } = useAppContext();

  const [bookings, setBookings] = useState([]);

  const fetchOwnerBookings = async () => {
    try {
      const { data } = await axios.get("/api/bookings/owner");
      if (data.success) {
        setBookings(data.bookings);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const serverMessage =
        error?.response?.data?.message || error.message || "Could not load booking requests";
      toast.error(serverMessage);
    }
  };

  const changeBookingStatus = async (bookingId, status) => {
    try {
      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking._id === bookingId ? { ...booking, status } : booking
        )
      );

      const { data } = await axios.post("/api/bookings/change-status", {
        bookingId,
        status,
      });
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
        // Revert on error
        fetchOwnerBookings();
      }
    } catch (error) {
      const serverMessage =
        error?.response?.data?.message || error.message || "Could not update booking status";
      toast.error(serverMessage);
      fetchOwnerBookings();
    }
  };

  useEffect(() => {
    fetchOwnerBookings();
  }, []);

  // Listen for real-time booking status updates
  useEffect(() => {
    const handleCarBooked = ({ carId }) => {
      // Refresh bookings when a car is booked to show latest status
      fetchOwnerBookings();
    };

    const handleCarAvailable = ({ carId }) => {
      // Refresh bookings when a car becomes available
      fetchOwnerBookings();
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
        title="Manage Bookings"
        subTitle="Track all customer bookings, approve or cancel requests, and manage booking statuses."
      />

      <div className="max-w-3xl w-full rounded-md overflow-hidden border border-borderColor mt-6">
        <table className="w-full border-collapse text-sm sm:text-md md:text-lg  text-gray-600">
          <thead className="text-gray-500 text-left">
            <tr>
              <th className="p-3 font-medium">Car</th>
              <th className="p-3 font-medium max-md:hidden">Date Range</th>
              <th className="p-3 font-medium">Total</th>
              <th className="p-3 font-medium max-md:hidden">Payment</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking, index) => (
              booking.car ? (
              <tr
                key={index}
                className="border-t border-borderColor text-gray-500"
              >
                <td className="p-3 flex items-center gap-3">
                  <img
                    src={booking.car.image}
                    alt="car image"
                    className="h-12 w-12 aspect-square rounded-md object-cover"
                  />
                  <p className="font-medium max-md:hidden">
                    {booking.car.brand} {booking.car.model}
                  </p>
                </td>

                <td className="p-3 max-md:hidden">
                  {booking.pickupDate.split("T")[0]} to{" "}
                  {booking.returnDate.split("T")[0]}
                </td>

                <td className="p-3">
                  {currency}
                  {booking.price}
                </td>

                <td className="p-3 max-md:hidden">
                  <span className="bg-gray-100 px-3 py-1 rounded-full text-xs">
                    offline
                  </span>
                </td>

                <td className="p-3">
                  {booking.status === "pending" ? (
                    <select
                      value={booking.status}
                      className="px-2 py-1.5 mt-1 text-gray-500 border border-borderColor rounded-md outline-none"
                      onChange={(e) => {
                        changeBookingStatus(booking._id, e.target.value);
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="confirmed">Confirmed</option>
                    </select>
                  ) : (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        booking.status === "confirmed"
                          ? "bg-green-100 text-green-500"
                          : "bg-red-100 text-red-500"
                      }`}
                    >
                      {booking.status}
                    </span>
                  )}
                </td>
              </tr>
              ) : (
              <tr
                key={index}
                className="border-t border-borderColor text-gray-500 bg-gray-50"
              >
                <td className="p-3">
                  <p className="font-medium text-gray-500">Car Deleted</p>
                </td>
                <td className="p-3 max-md:hidden text-sm text-gray-400">N/A</td>
                <td className="p-3">
                  {currency}
                  {booking.price}
                </td>
                <td className="p-3 max-md:hidden">
                  <span className="bg-gray-100 px-3 py-1 rounded-full text-xs">
                    offline
                  </span>
                </td>
                <td className="p-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    booking.status === "confirmed"
                      ? "bg-green-100 text-green-500"
                      : "bg-red-100 text-red-500"
                  }`}>
                    {booking.status}
                  </span>
                </td>
              </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageBookings;
