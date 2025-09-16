export default function Settings() {
  return (
    <div className="p-6 h-screen rounded-lg shadow-md max-w-lg mx-auto border-2 border-black space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Accessibility Section */}
      <section className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h2 className="font-semibold text-lg">Accessibility</h2>
        <label className="flex items-center gap-2 mt-2">
          <input type="checkbox" className="w-5 h-5" />
          <span>Enable Voice Commands</span>
        </label>
        <label className="flex items-center gap-2 mt-2">
          <input type="checkbox" className="w-5 h-5" />
          <span>Large Text</span>
        </label>
        <label className="flex items-center gap-2 mt-2">
          <input type="checkbox" className="w-5 h-5" />
          <span>High Contrast Mode</span>
        </label>
      </section>

      {/* Security Section */}
      <section className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h2 className="font-semibold text-lg">Security</h2>
        <button className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Change Passcode
        </button>
        <button className="w-full mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          Logout
        </button>
      </section>
    </div>
  );
}
