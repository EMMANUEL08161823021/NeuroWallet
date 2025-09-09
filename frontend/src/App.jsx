import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import Homepage from "./components/Homepage/Homepage";
import Login from './components/Login/Login';
import Navbar from './components/Navbar/Navbar';
import Cart from './components/Transaction/Transaction';
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import Documentation from "./components/Documentation/Documentation";

import Send from './components/SendMoney';
import LandingPage from './components/LandingPage/LandingPage';
import AccessibleTransfer from './components/AccessibleTransfer/AccessibleTransfer';


function App() {
  const ProtectedAdminRoute = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(null);

    useEffect(() => {
      const checkAdmin = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAdmin(false);
        return;
      }
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      } catch (err) {
        setIsAdmin(false);
      }
      };
      checkAdmin();
    }, []);

    if (isAdmin === null) return <div>Loading...</div>;
    return isAdmin ? children : <Navigate to="/login" />;
  };

  return (
    <>
      {/* <Navbar/> */}
      <Routes>
        <Route path="/" element={<LandingPage/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transfer" element={<AccessibleTransfer />} />
        {/* <Route path="/dashboard" element={<Homepage />} /> */}
        <Route path="/cart" element={<Cart/>} />
        <Route path="/docs" element={<Documentation/>} />
        <Route path="/send" element={<Send/>} />
        {/* <Route
          path="/admin"
          element={
              <ProtectedAdminRoute>
                <AdminPanel />
              </ProtectedAdminRoute>
          }
        /> */}
        {/* <Route path="/product/:id" element={<ProductPage />} /> */}
        {/* <Route path="/contact" element={<Contact />} /> */}
      </Routes>


    </>
  )
}

export default App;


