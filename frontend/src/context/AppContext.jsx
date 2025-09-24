// src/context/AppContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import {jwtDecode} from "jwt-decode";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      console.log("Decoded token:", decoded);
      console.log("Email from token:", decoded.email); // ✅ correct

      setEmail(decoded.email)

      const fetchData = async () => {
        try {
          // Fetch profile
          const profileRes = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/wallet/profile`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setUser(profileRes.data.user);

          // Fetch wallet
          const walletRes = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/wallet/me`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setBalance(walletRes.data.balance);
          setWallet(walletRes.data.transactions || []);
        } catch (err) {
          console.error("Failed to fetch global data:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    } catch (err) {
      console.error("Invalid token:", err);
      setLoading(false);
    }
  }, []);

  return (
    <AppContext.Provider value={{ user, wallet, loading, balance, email }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
