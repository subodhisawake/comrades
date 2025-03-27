import React, { useState, useEffect } from 'react';
import { APIProvider, Map } from '@vis.gl/react-google-maps';
import MapComponent from '../../components/core/MapView/Map';
import api from '../../services/api';
import './CreatePost.css';

const CreatePost = () => {
  const [content, setContent] = useState('');
  const [location, setLocation] = useState(null);
  const [radius, setRadius] = useState(1000);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      error => alert('Enable location access to create posts')
    );
  }, []);

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
      alert(error.response?.data?.message || 'Failed to create post');
    }
  };

  if (!location) return <div>Loading map...</div>;

  return (
    <div className="create-post-container">
      <h2>Create New Post</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="What's happening in your area?"
          required
        />

        <div className="map-container">
          <APIProvider 
            apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
            onLoad={() => console.log('Maps API loaded')}
          >
            <Map
              defaultCenter={location}
              defaultZoom={14}
              mapId={process.env.REACT_APP_MAP_ID}
              style={{ height: '400px', width: '100%' }}
            >
              <MapComponent
                location={location}
                radius={radius}
                onRadiusChange={setRadius}
                onLocationChange={setLocation}
              />
            </Map>
          </APIProvider>
          <div className="radius-display">
            Current Radius: {Math.round(radius)} meters
          </div>
        </div>

        <button type="submit">Create Post</button>
      </form>
    </div>
  );
};

export default CreatePost;
