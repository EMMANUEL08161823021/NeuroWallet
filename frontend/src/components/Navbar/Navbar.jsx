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
