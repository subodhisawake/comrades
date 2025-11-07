import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import "./../styles/Header.css";
import logo from '../assets/logo.png';

const Header = () => {
  const { user, logout } = useContext(AuthContext) || {};
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="header-container">
      <nav className="nav-bar">
        <div className="logo-container">
          <Link to="/">
            <img src={logo} alt="Comrades Logo" className="logo" />
          </Link>
        </div>
        
        <div className="mobile-menu-button" onClick={toggleMobileMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>
        
        <ul className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {/* Updated Home/Feed link */}
          <li>
            <Link to={user ? "/feed" : "/"}>
              {user ? "Feed" : "Home"}
            </Link>
          </li>
          {user ? (
            <>
              <li><Link to="/create-post">Create Post</Link></li>
              <li><Link to="/profile">Profile</Link></li>
              <li><button className="logout-btn" onClick={logout}>Logout</button></li>
            </>
          ) : (
            <>
              <li><Link to="/login" className="login-link">Login</Link></li>
              <li><Link to="/register" className="register-link">Register</Link></li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;
