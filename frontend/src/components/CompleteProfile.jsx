import { useState } from "react";

export default function CompleteProfile({ onSubmit }) {
    const [form, setForm] = useState({
        firstName: "",
        email: "",
        phone: "",
    });

    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState(null);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setNotice(null);

        try {
            const token = localStorage.getItem("access");

            if (!token) {
                setNotice({ type: "error", msg: "No access token found!" });
                setLoading(false);
                return;
            }

            const res = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/user/complete-profile`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(form),
                }
            );

            const data = await res.json();
            console.log("Data:", data);

            if (!res.ok) {
            setNotice({ type: "error", msg: data.message || "Failed to create Flutterwave account!" });
            } else if (data.success) {
            setNotice({ type: "success", msg: data.message || "Profile completed!" });
            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 1500);
            } else {
            setNotice({ type: "error", msg: data.message || "Failed to complete profile" });
            }

        } catch (err) {
            setNotice({
                type: "error",
                msg: err.message || "Unexpected error occurred",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-lg p-8">
                <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100">
                    Complete Your Profile
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
                    We need a few details to set up your wallet account.
                </p>

                {notice && (
                    <div
                        className={`mt-4 p-3 rounded-md text-sm ${
                            notice.type === "success"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                        }`}
                    >
                        {notice.msg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Name
                        </label>
                        <input
                            type="text"
                            name="firstName"
                            value={form.firstName}
                            onChange={handleChange}
                            required
                            className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700 dark:text-white focus:ring focus:ring-green-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email
                        </label>
                        <input
                            type="text"
                            name="lastName"
                            value={form.email}
                            onChange={handleChange}
                            required
                            className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700 dark:text-white focus:ring focus:ring-green-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="08012345678"
                            required
                            className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700 dark:text-white focus:ring focus:ring-green-400"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? "Saving..." : "Save & Continue"}
                    </button>
                </form>
            </div>
        </div>
    );
}
