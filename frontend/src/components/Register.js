// src/pages/Register/index.js
import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

import './../styles/Login.css';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [locationError, setLocationError] = useState(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            type: 'Point',
            coordinates: [
              position.coords.longitude,
              position.coords.latitude
            ]
          });
        },
        (error) => {
          reject(error);
        }
      );
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocationError(null);

    try {
      // Get user's current location
      const location = await getLocation();
      
      // Register with location data
      const response = await api.post('/auth/register', { 
        name, 
        email, 
        password,
        location
      });

      // Store tokens
      localStorage.setItem('token', response.data.accessToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
      
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.message.includes('geolocation')) {
        setLocationError('Please enable location services to register');
      } else if (error.response?.data?.errors) {
        alert(error.response.data.errors.map(e => e.msg).join('\n'));
      } else {
        alert('Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Register</h2>
        
        {locationError && <div className="error-message">{locationError}</div>}

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        
        <div className="location-note">
          <small>We need your location to connect you with nearby users</small>
        </div>

        <button type="submit">Register</button>
        
        <p className="auth-switch">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
