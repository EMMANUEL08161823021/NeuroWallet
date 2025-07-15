import React, { useState } from "react";

const transactionsData = [
  {
    id: 1,
    name: "Emmanuel",
    amount: 5000,
    status: "Success",
    date: "2025-07-15 10:20 AM",
    provider: "Opay",
    description: "Rent payment",
  },
  {
    id: 2,
    name: "Heuro",
    amount: 3000,
    status: "Pending",
    date: "2025-07-14 03:30 PM",
    provider: "Palmpay",
    description: "Food delivery",
  },
  {
    id: 3,
    name: "Richard",
    amount: 12000,
    status: "Failed",
    date: "2025-07-13 09:10 AM",
    provider: "Kuda",
    description: "Loan repayment",
  },
];

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [selectedTxn, setSelectedTxn] = useState(null);

  const filtered = transactionsData.filter((txn) =>
    txn.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Transactions</h2>

      <input
        type="search"
        className="form-control mb-3"
        placeholder="Search by name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {filtered.length === 0 && <p className="text-muted">No transactions found.</p>}

      <ul className="list-group">
        {filtered.map((txn) => (
          <li
            key={txn.id}
            className="list-group-item d-flex justify-content-between align-items-center"
            onClick={() => setSelectedTxn(txn)}
            role="button"
            data-bs-toggle="modal"
            data-bs-target="#txnModal"
          >
            <div>
              <strong>{txn.name}</strong> <br />
              <small>{txn.date}</small>
            </div>
            <div className="text-end">
              <span
                className={`badge bg-${
                  txn.status === "Success"
                    ? "success"
                    : txn.status === "Failed"
                    ? "danger"
                    : "warning text-dark"
                }`}
              >
                {txn.status}
              </span>
              <div>₦{txn.amount.toLocaleString()}</div>
            </div>
          </li>
        ))}
      </ul>

      {/* Modal for Transaction Details */}
      <div
        className="modal fade"
        id="txnModal"
        tabIndex="-1"
        aria-labelledby="txnModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            {selectedTxn && (
              <>
                <div className="modal-header">
                  <h5 className="modal-title" id="txnModalLabel">
                    Transaction Details
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  <p><strong>Name:</strong> {selectedTxn.name}</p>
                  <p><strong>Amount:</strong> ₦{selectedTxn.amount.toLocaleString()}</p>
                  <p><strong>Date:</strong> {selectedTxn.date}</p>
                  <p><strong>Provider:</strong> {selectedTxn.provider}</p>
                  <p><strong>Status:</strong> {selectedTxn.status}</p>
                  <p><strong>Description:</strong> {selectedTxn.description}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
