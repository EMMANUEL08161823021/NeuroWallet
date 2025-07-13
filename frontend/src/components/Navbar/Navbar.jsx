import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { FaSearch } from 'react-icons/fa';

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useContext(AuthContext);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  
  const cartPage = () => {

    if(user){
      console.log('Hello');
      
      navigate('/cart');
    } else {
      navigate('/login');
    }
  }

  useEffect(() => {

    const fetchCart = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/cart`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch cart');
        const data = await response.json();
        const count = data.items.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(count);
      } catch (err) {
        console.error(err);
      }
    };

    // Run initially
    fetchCart();

    // Set up interval
    const interval = setInterval(fetchCart, 1000); // fetch every second

    // Clean up interval on component unmount or login status change
    return () => clearInterval(interval);
  }, [isLoggedIn]);


  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
    setIsLoggedIn(false);
    setCartCount(0);
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light fixed-top">
      <div className="col-12 col-lg-5 mx-auto border">
        <div className="d-flex align-items-center px-2 gap-2">
          <Link className="navbar-brand" to="/">NeuroWallet</Link>

          <div className="nav-link position-relative me-3" onClick={cartPage}>
            <i className="bi bi-cart" style={{ fontSize: "1.2rem" }}></i>
            {cartCount > 0 && (
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-primary">
                {cartCount}
            </span>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
