import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import Homepage from "./components/Homepage/Homepage";
import Login from './components/Login/Login';
import Navbar from './components/Navbar/Navbar';
import Cart from './components/Transaction/Transaction';
import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import Documentation from "./components/Documentation/Documentation";
import ProtectedRoute from './components/ProtectedRoute';
import Send from './components/SendMoney';
import LandingPage from './components/LandingPage/LandingPage';
import AccessibleTransfer from './components/AccessibleTransfer/AccessibleTransfer';
// import MagicCallback from './components/MagicCallback';
import AuthCallback from './components/AuthCallback';
import AccessibleSendMoney from './components/AccessibleSendMoney';
import SendMoney from './components/SendMoney';
import CompleteProfile from './components/CompleteProfile';


function App() {

  
  return (
    <>
      {/* <Navbar/> */}
      <Routes>
        <Route path="/" element={<LandingPage/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/transfer" element={<AccessibleTransfer />} />
        <Route path="/cart" element={<Cart/>} />
        <Route path="/docs" element={<Documentation/>} />
        <Route path="/send" element={<Send/>} />
        <Route path="/complete-profile" element={<CompleteProfile/>} />
        <Route path="/sendmoney" element={<AccessibleSendMoney/>} />
        {/* <Route path="/auth/magic" element={<MagicCallback />} /> */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>


    </>
  )
}

export default App;


