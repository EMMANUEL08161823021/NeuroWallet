import { useState } from "react";
import Logo from "../../../public/logo.png";

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("getting-started");

  const docs = {
    "getting-started": {
      title: "Getting Started",
      content: (
        <>
          <p className="mb-4">
            Welcome to <strong>NeuroWallet API</strong>. Use this guide to integrate transfers,
            collections, and authentication into your app.
          </p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                1. Getting Started<br/>

                Open the app.<br/>

                The app will automatically read the screen aloud so you don’t need to see or touch much.<br/>

                You can swipe left or right to move between options.<br/>

                To choose an option, double-tap anywhere on the screen
          </pre>
        </>
      ),
    },
    authentication: {
      title: "Authentication",
      content: (
        <>
          <p className="mb-4">
            Authenticate every request with your <strong>Secret Key</strong>.
          </p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
            {`curl https://api.neurowallet.com/v1/transfer
            -H "Authorization: Bearer YOUR_SECRET_KEY"`}
          </pre>
        </>
      ),
    },
    transfer: {
      title: "Send Money",
      content: (
        <>
          <p className="mb-4">
            Use this endpoint to send money from your wallet to a customer’s bank account.
          </p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
            {`POST /api/v1/transfers
            Content-Type: application/json
            Authorization: Bearer SECRET_KEY

            {
            "amount": 5000,
            "account_number": "1234567890",
            "bank_code": "058"
            }`}
          </pre>
        </>
      ),
    },
    receive: {
      title: "Receive Money",
      content: (
        <>
          <p className="mb-4">
            Use this endpoint to send money from your wallet to a customer’s bank account.
          </p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
            {`POST /api/v1/transfers
            Content-Type: application/json
            Authorization: Bearer SECRET_KEY

            {
            "amount": 5000,
            "account_number": "1234567890",
            "bank_code": "058"
            }`}
          </pre>
        </>
      ),
    },
    webhooks: {
      title: "Webhooks",
      content: (
        <>
          <p className="mb-4">
            NeuroWallet notifies your server of events (e.g., transfer success, failure)
            using webhooks.
          </p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
            {`POST https://yourserver.com/webhooks
            {
            "event": "transfer.success",
            "data": {
                "amount": 5000,
                "account_number": "1234567890"
            }
            }`}
          </pre>
        </>
      ),
    },
  };

  return (
    <div className="flex flex-col h-[100vh]">
      {/* Sidebar */}
        <div className="bg-gray-100 dark:bg-gray-900 px-4 flex justify-around items-center h-34 w-[100%]">
            <div className="flex gap-2 ">
                <img src={Logo} className="h-20 w-20" alt="Logo"/>
                <h2 className="border">NeuroWallet</h2>
            </div>

            <input
            type="search"
            className="w-[70%] p-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search beneficiary..."
            // value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search beneficiaries"
            />
            <button className="border">Sign Up</button>
        </div>
        <div className="flex h-[100%]">
            <aside className="w-64 bg-gray-100 dark:bg-gray-900 p-6 space-y-4">
                <h2 className="text-xl font-bold mb-6">📚 Documentation</h2>
                <nav className="space-y-3">
                {Object.keys(docs).map((key) => (
                    <button
                    key={key}
                    onClick={() => setActiveSection(key)}
                    className={`block text-left w-full px-3 py-2 rounded-md transition ${
                        activeSection === key
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                    >
                    {docs[key].title}
                    </button>
                ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-10 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                <h1 className="text-3xl font-bold mb-6">{docs[activeSection].title}</h1>
                <div className="prose dark:prose-invert max-w-none">
                {docs[activeSection].content}
                </div>
            </main>
        </div>
    </div>
  );
}
