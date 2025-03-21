import React, { useState, useEffect } from 'react';
import { APIProvider, Map, useMapsLibrary } from '@vis.gl/react-google-maps';
import api from '../../services/api';
import './CreatePost.css';

const CreatePost = () => {
  const [content, setContent] = useState('');
  const [location, setLocation] = useState(null);
  const [radius, setRadius] = useState(1000);
  const [zoom, setZoom] = useState(14);
  const [circle, setCircle] = useState(null);
  const core = useMapsLibrary('core');

  useEffect(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        alert('Unable to retrieve your location');
      }
    );
  }, []);

  useEffect(() => {
    if (!core || !location) return;

    const newCircle = new core.Circle({
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#FF0000',
      fillOpacity: 0.35,
      center: location,
      radius: radius,
      map: null
    });

    setCircle(newCircle);
    return () => newCircle.setMap(null);
  }, [core, location, radius]);

  useEffect(() => {
    if (!circle || !location) return;
    
    circle.setRadius(radius);
    circle.setCenter(location);
  }, [circle, radius, location]);

  const handleZoomChange = (zoomValue) => {
    const newZoom = zoomValue;
    setZoom(newZoom);
    setRadius(Math.pow(2, 20 - newZoom) * 10);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/posts', {
        content,
        location: {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        },
        radius
      });
      alert('Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    }
  };

  if (!location) return <div>Loading your location...</div>;

  return (
    <div className="create-post-container">
      <h2>Create New Post</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What do you need?"
          required
        />
        
        <div className="map-container">
          <APIProvider apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
            <Map
              center={location}
              zoom={zoom}
              onZoomChanged={(ev) => handleZoomChange(ev.zoom)}
              style={{ height: '400px', width: '100%' }}
              onLoad={(map) => circle?.setMap(map)}
            >
              {/* Circle will be managed through Google Maps API */}
            </Map>
          </APIProvider>
          <div className="radius-display">
            Current Coverage: {(radius / 1000).toFixed(1)} km
          </div>
        </div>

        <button type="submit">Create Post</button>
      </form>
    </div>
  );
};

export default CreatePost;
