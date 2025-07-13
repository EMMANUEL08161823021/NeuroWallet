// import React from "react";
import { useState, useEffect } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { wordsToNumbers } from "words-to-numbers";

const Homepage = () => {
  const [amount, setAmount] = useState("");
  const [numericAmount, setNumericAmount] = useState(null);
  const [accountFrom, setAccountFrom] = useState("");
  const [accountTo, setAccountTo] = useState("");
  const [error, setError] = useState("");

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition ? useSpeechRecognition() : {
    transcript: "",
    listening: false,
    resetTranscript: () => {},
    browserSupportsSpeechRecognition: false,
  };

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      setError("Your browser does not support speech recognition. Please use Chrome.");
    }
  }, [browserSupportsSpeechRecognition]);

  useEffect(() => {
    if (transcript) {
      try {
        const cleanedTranscript = transcript
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, "");
        const numericValue = wordsToNumbers(cleanedTranscript, { fuzzy: false });
        if (numericValue && !isNaN(numericValue)) {
          const formattedAmount = parseFloat(numericValue).toFixed(2);
          setNumericAmount(formattedAmount);
          setAmount(formattedAmount);
        } else {
          setError(
            "Could not parse the spoken amount. Please try again (e.g., 'one hundred dollars')."
          );
        }
      } catch (err) {
        setError("Error processing spoken amount. Please try again.");
      }
    }
  }, [transcript]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!numericAmount || isNaN(numericAmount) || parseFloat(numericAmount) <= 0) {
      setError("Please provide a valid amount.");
      return;
    }
    if (!accountFrom || !accountTo) {
      setError("Please fill in both account fields.");
      return;
    }
    setError("");
    alert(`Transferring $${numericAmount} from ${accountFrom} to ${accountTo}`);
    setAmount("");
    setNumericAmount(null);
    setAccountFrom("");
    setAccountTo("");
    resetTranscript();
  };

  const startListening = () => {
    if (!browserSupportsSpeechRecognition) return;
    resetTranscript();
    setError("");
    SpeechRecognition.startListening({ continuous: false, language: "en-US" });
  };

  const stopListening = () => {
    if (!browserSupportsSpeechRecognition) return;
    SpeechRecognition.stopListening();
  };

  return (
    <div
      className="position-relative col-12 col-sm-9 col-lg-5 mx-auto overflow-scroll p-2 border"
      style={{ height: "100vh", border: "2px solid black" }}
    >
      <div style={{ height: "56px" }}></div>
      <h2>Welcome Back</h2>
      <div>
        <h3 style={{ fontSize: "15px" }}>Beneficiary</h3>
        <p style={{ fontSize: "13px" }}>List of Beneficiaries.</p>
        <div>
          <input type="search" className="form-control" />
        </div>

        <div className="d-flex flex-column gap-2 mt-2">
          {[
            { name: "Emmanuel", provider: "Palmpay" },
            { name: "Heuro", provider: "Opay" },
          ].map((b, idx) => (
            <div
              key={idx}
              className="border text-dark p-2 rounded border-black d-flex align-items-center justify-content-between"
            >
              <div className="col-12">
                <div className="d-flex align-items-center gap-1">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`checkbox-${idx}`}
                    />
                  </div>
                  <div
                    role="button"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#offcanvasTwo"
                    aria-controls="offcanvasTwo"
                    style={{ width: "100%" }}
                    className="d-flex flex-column text-left"
                  >
                    <p style={{ fontSize: "13px" }} className="mb-0">
                      {b.name}
                    </p>
                    <span style={{ fontSize: "11px" }} className="text-muted">
                      {b.provider}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create To-Do Offcanvas */}
        <div
          className="offcanvas offcanvas-bottom"
          style={{ height: "100vh" }}
          id="offcanvasOne"
          tabIndex="-1"
        >
          <div className="offcanvas-body small">
            <h2>Create a new to-do list</h2>
            <p>
              Please fill out this form to ensure a secure and customised
              learning journey
            </p>
            <form className="container px-0">
              <div className="d-flex flex-column gap-2">
                <div className="d-flex flex-column">
                  <label>Task Name</label>
                  <input
                    className="form-control"
                    name="name"
                    type="text"
                    required
                    placeholder="Enter the title of the task"
                  />
                </div>
                <div className="d-flex flex-column">
                  <label>Description</label>
                  <input
                    className="form-control"
                    name="description"
                    type="text"
                    required
                    placeholder="What it entails"
                  />
                </div>
                <div className="d-flex flex-column col-12">
                  <label>Task Date and Time</label>
                  <div className="d-flex justify-content-between">
                    <div className="d-flex flex-column" style={{ width: "45%" }}>
                      <label>Date</label>
                      <input
                        className="form-control"
                        name="date"
                        type="date"
                        required
                      />
                    </div>
                    <div className="d-flex flex-column" style={{ width: "45%" }}>
                      <label>Time</label>
                      <input
                        className="form-control"
                        name="time"
                        type="time"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="d-flex flex-column">
                  <label>How often?</label>
                  <input
                    className="form-control"
                    name="frequency"
                    type="text"
                    required
                    placeholder="daily, weekly, monthly"
                  />
                </div>
                <div className="d-flex justify-content-between mt-2">
                  <button
                    className="btn btn-outline-secondary"
                    data-bs-dismiss="offcanvas"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-dark"
                    type="submit"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Edit Beneficiary Offcanvas */}
        <div
          className="offcanvas offcanvas-bottom"
          style={{ height: "100vh" }}
          id="offcanvasTwo"
          tabIndex="-1"
        >
          <div className="offcanvas-body small">
            <div className="container d-flex justify-content-between align-items-center px-0">
              <div>
                <h2>Emmanuel</h2>
                <p>7082659880 Opay</p>
              </div>
              <button
                className="btn btn-outline-secondary"
                data-bs-dismiss="offcanvas"
                type="button"
              >
                Cancel
              </button>
            </div>
            {error && <p className="text-danger mt-2">{error}</p>}
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label>Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setNumericAmount(e.target.value);
                    setError("");
                  }}
                  className="form-control"
                  placeholder="Enter or speak amount"
                />
              </div>
              <div className="mb-3">
                <label>From Account</label>
                <input
                  type="text"
                  value={accountFrom}
                  onChange={(e) => setAccountFrom(e.target.value)}
                  className="form-control"
                  placeholder="e.g., Checking 1234"
                />
              </div>
              <div className="mb-3">
                <label>To Account</label>
                <input
                  type="text"
                  value={accountTo}
                  onChange={(e) => setAccountTo(e.target.value)}
                  className="form-control"
                  placeholder="e.g., Savings 5678"
                />
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={startListening}
                  disabled={!browserSupportsSpeechRecognition || listening}
                >
                  {listening ? "Listening..." : "Speak Amount"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={stopListening}
                  disabled={!listening}
                >
                  Stop
                </button>
              </div>
              <button
                type="submit"
                className="btn btn-success mt-3 w-100"
              >
                Confirm Payment
              </button>
            </form>
          </div>
        </div>

        {/* Add Button */}
        <button
          className="btn btn-primary rounded-circle position-fixed d-flex justify-content-center align-items-center"
          style={{ bottom: "20px", right: "20px", width: "60px", height: "60px" }}
          data-bs-toggle="offcanvas"
          data-bs-target="#offcanvasOne"
        >
          ADD
        </button>
      </div>
    </div>
  );
};

export default Homepage;
