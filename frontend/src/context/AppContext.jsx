// src/context/AppContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [wallet, setWallet] = useState([]);
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(0);
  

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
        setLoading(false);
        return;
        }

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
    }, []);

  return (
    <AppContext.Provider value={{ user, wallet, loading, balance }}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useApp = () => useContext(AppContext);
