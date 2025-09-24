import { useState, useEffect } from "react";
import axios from "axios";

import { useApp } from "../../context/AppContext";

export default function Transactions() {
  const [query, setQuery] = useState("");
  const [selectedTxn, setSelectedTxn] = useState(null);

  const {wallet} = useApp();

  // Sort wallet by date descending (latest first)
  const sortedWallet = [...wallet].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // Then filter
  const filtered = sortedWallet.filter((txn) =>
    `${txn.type} ${txn.reference} ${txn.to} ${txn.from}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );


  return (
    <div className="p-6 h-screen rounded-lg shadow-md max-w-lg mx-auto border-2 border-black">
      <h2 className="text-2xl font-bold mb-4">Transactions</h2>

      {/* Search Bar */}
      <input
        type="search"
        className="w-full p-2 border rounded-lg mb-4 focus:ring focus:ring-blue-400"
        placeholder="Search transactions..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {filtered.length === 0 && (
        <p className="text-gray-500 text-center">No transactions found.</p>
      )}

      {/* Transaction List */}
      <ul className="space-y-3">
        {filtered.map((txn, idx) => (
          <li
            key={idx}
            onClick={() => setSelectedTxn(txn)}
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <div>
              <p className="font-semibold">
                {txn.type === "fund"
                  ? "Wallet Funding"
                  : `Transfer ${txn.to ? "to " + txn.to : ""}`}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(txn.date).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  txn.status === "success"
                    ? "bg-green-100 text-green-700"
                    : txn.status === "failed"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {txn.status}
              </span>
              <p className="font-bold">₦{txn.amount?.toLocaleString()}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Transaction Details</h3>
              <button
                onClick={() => setSelectedTxn(null)}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Type:</strong> {selectedTxn.type}</p>
              <p><strong>Amount:</strong> ₦{selectedTxn.amount.toLocaleString()}</p>
              <p><strong>Date:</strong> {new Date(selectedTxn.date).toLocaleString()}</p>
              <p><strong>Reference:</strong> {selectedTxn.reference}</p>
              {selectedTxn.to && <p><strong>To:</strong> {selectedTxn.to}</p>}
              {selectedTxn.from && <p><strong>From:</strong> {selectedTxn.from}</p>}
              <p><strong>Status:</strong> {selectedTxn.status}</p>
            </div>
            <div className="mt-6 text-right">
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
