import { assets } from "@/assets/assets";
import { useAppContext } from "@/context/AppContext";
import { useState } from "react";
import toast from "react-hot-toast";

const Banner = () => {
  const { token, isOwner, setIsOwner, setShowLogin, axios, navigate } = useAppContext();
  const [loading, setLoading] = useState(false);

  const handleListClick = async () => {
    if (!token) {
      setShowLogin(true);
      return;
    }

    if (isOwner) {
      navigate("/owner/add-car");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post("/api/owner/change-role");
      if (data && data.success) {
        toast.success("Role updated — you are now an owner");
        setIsOwner(true);
        navigate("/owner/add-car");
      } else {
        toast.error(data?.message || "Could not change role");
      }
    } catch (err) {
      const serverMessage = err?.response?.data?.message || err.message;
      toast.error(serverMessage || "Could not request owner role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-start items-center justify-between px-8 min-md:pl-14 pt-10 bg-gradient-to-r from-[#0558FE] to-[#A9CFFF] max-w-6xl mx-3 md:mx-auto rounded-2xl overflow-hidden">
      <div className="text-white">
        <h2 className="text-3xl font-medium">Do You Own a Luxury Car?</h2>
        <p className="mt-2">Monetize your vehicle effortlessly by listing it on carRental.</p>
        <p className="max-w-130">
          We take care of insurance, driver verification and secure payments - so you can earn passive income, stress-free.
        </p>
        <button
          onClick={handleListClick}
          disabled={loading}
          className={`px-6 py-2 ${loading ? "bg-gray-200 text-gray-500" : "bg-white hover:bg-slate-100 text-primary"} transition-all rounded-lg text-sm mt-4 cursor-pointer`}
        >
          {loading ? "Please wait..." : "List your car"}
        </button>
      </div>
      <img src={assets.banner_car_image} alt="car banner" className="max-h-45 mt-10" />
    </div>
  );
};

export default Banner;
