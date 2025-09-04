import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Homepage from "./components/Homepage/Homepage";
import Login from './components/Login/Login';
import Navbar from './components/Navbar/Navbar';
// import ProductPage from './components/Product/ProductPage';
// import AdminPanel from './components/AdminPanel/AdminPanel';
import Cart from './components/Transaction/Transaction';
import Register from './components/Register/Register';
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

import Search from './components/Search';
import LandingPage from './components/LandingPage/LandingPage';


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
        <Route path="/dashboard" element={<Homepage />} />
        <Route path="/cart" element={<Cart/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="/search" element={<Search />} />
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


