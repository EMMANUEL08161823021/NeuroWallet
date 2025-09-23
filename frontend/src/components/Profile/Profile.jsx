
import { useApp } from "../../context/AppContext";


export default function Profile() {

  const { user, loading } = useApp();



  if (loading) {
    return <div className="p-6 text-center">Loading profile...</div>;
  }

  if (!user) {
    return <div className="p-6 text-center">No user data found.</div>;
  }

  return (
    <div className="p-6 h-screen rounded-lg shadow-md max-w-lg mx-auto border-2 border-black">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>

      {/* User Info */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4">
        <p>
          <strong>Name:</strong> {user.name}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Phone:</strong> {user.phone}
        </p>
      </div>

      {/* KYC Info */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <p>
          <strong>KYC Level:</strong> {user.kycLevel || "Tier 1"}
        </p>
        <button className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
          Upgrade KYC
        </button>
      </div>
    </div>
  );
}
