export default function Profile() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4">
        <p><strong>Name:</strong> John Doe</p>
        <p><strong>Email:</strong> johndoe@mail.com</p>
        <p><strong>Phone:</strong> +234 801 234 5678</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <p><strong>KYC Level:</strong> Tier 1</p>
        <button className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
          Upgrade KYC
        </button>
      </div>
    </div>
  );
}
