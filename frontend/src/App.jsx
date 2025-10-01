import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login/Login';
import Cart from './components/Transaction/Transaction';
import Dashboard from './components/Dashboard/Dashboard';
import Documentation from "./components/Documentation/Documentation";
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './components/LandingPage/LandingPage';
import AccessibleTransfer from './components/AccessibleTransfer/AccessibleTransfer';
import AuthCallback from './components/AuthCallback';
import AccessibleSendMoney from './components/AccessibleSendMoney';
import CompleteProfile from './components/CompleteProfile';
import PaymentCallback from './pages/PaymentCallback';
import NotFound from './components/NotFound';


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
        <Route path="/*" element={<NotFound/>} />
        <Route path="/complete-profile" element={<CompleteProfile/>} />
        <Route path="/sendmoney" element={<AccessibleSendMoney/>} />
        <Route path="/payment/callback" element={<PaymentCallback />} />

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


