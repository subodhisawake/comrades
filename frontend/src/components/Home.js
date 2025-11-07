import React from 'react';
import { Link } from 'react-router-dom';
import Lottie from 'react-lottie-player';
import animationData from '../animations/Animation - 1742459445754.json';
import './../styles/Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Connect with <span className="highlight">Comrades</span></h1>
          <p className="hero-subtitle">Build a stronger community by sharing skills and resources with those around you</p>
          <div className="hero-buttons">
            <Link to="/register" className="cta-button primary">Join Now</Link>
            <Link to="/about" className="cta-button secondary">Learn More</Link>
          </div>
          <div className="stat-circles">
            <div className="stat-circle">
              <span className="stat-number">15k+</span>
              <span className="stat-label">Members</span>
            </div>
            <div className="stat-circle">
              <span className="stat-number">5k+</span>
              <span className="stat-label">Helpers</span>
            </div>
            <div className="stat-circle">
              <span className="stat-number">20k+</span>
              <span className="stat-label">Tasks</span>
            </div>
          </div>
        </div>
        <div className="hero-animation">
          <div className="animation-container">
            <Lottie loop animationData={animationData} play style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Set Your Radius</h3>
            <p>Choose how far you want to reach within your community</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Connect Locally</h3>
            <p>Find and meet neighbors who can help or need assistance</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Exchange Value</h3>
            <p>Share skills, sell items, or offer services within your radius</p>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="feature">
          <div className="feature-icon offer-help"></div>
          <h2>Offer Help</h2>
          <p>Share your skills and knowledge with neighbors who need assistance</p>
          <Link to="/offer-help" className="feature-link">Start Helping →</Link>
        </div>
        <div className="feature">
          <div className="feature-icon marketplace"></div>
          <h2>Marketplace</h2>
          <p>Buy, sell, or rent items and services within your community</p>
          <Link to="/marketplace" className="feature-link">Browse Marketplace →</Link>
        </div>
        <div className="feature">
          <div className="feature-icon find-help"></div>
          <h2>Find Help</h2>
          <p>Discover local resources and support from people nearby</p>
          <Link to="/find-help" className="feature-link">Get Assistance →</Link>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-text">
          <h2>Ready to join your local community?</h2>
          <p>Get started today and see who's nearby waiting to connect</p>
        </div>
        <Link to="/register" className="cta-button primary large">Join Comrades Now</Link>
      </section>
    </div>
  );
};

export default Home;
