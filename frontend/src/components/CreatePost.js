import React, { useState, useEffect, useCallback } from 'react';
import { APIProvider, Map } from '@vis.gl/react-google-maps';
import MapComponent from './Map';
import api from '../services/api';
import './../styles/CreatePost.css';

// Simple debounce utility function
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(null, args);
    }, delay);
  };
};

const CreatePost = () => {
  const [content, setContent] = useState('');
  const [location, setLocation] = useState(null);
  const [radius, setRadius] = useState(1000);
  // NEW STATE: To store the AI's categorization result
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  // NEW FUNCTION: Calls the backend AI route
  const analyzePostContent = async (text) => {
    if (text.trim().length < 5) {
      setAiSuggestions(null);
      return;
    }
    
    setIsAnalyzing(true);
    try {
      // Calls the new route we added to the backend
      const response = await api.post('/posts/analyze-content', { content: text });
      setAiSuggestions(response.data);
    } catch (error) {
      console.error('AI analysis failed:', error);
      setAiSuggestions(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Debounced version of the analysis function
  // We use useCallback to memoize the debounced function
  const debouncedAnalyze = useCallback(
    debounce(analyzePostContent, 500),
    []
  );

  // UPDATED HANDLER: Triggers analysis on every text change
  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    debouncedAnalyze(newContent);
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
        radius,
        // CRUCIAL UPDATE: Include the AI categorization data in the payload
        ai_categorization: aiSuggestions 
      });
      alert('Post created successfully!');
      // Reset form fields
      setContent('');
      setAiSuggestions(null);
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
          onChange={handleContentChange} // Use the new handler
          placeholder="What's happening in your area? (e.g., I need to borrow a ladder)"
          required
        />
        
        {/* NEW RENDER SECTION: Display AI Suggestions */}
        <div className="ai-feedback-container">
          {isAnalyzing && <p className="analysis-status">Analyzing text...</p>}
          {aiSuggestions && (
            <div className="ai-suggestions">
              <p>🤖 **AI Suggestions (Refine your request):**</p>
              <p>
                **Type:** <span style={{ fontWeight: 'bold', color: '#6a0dad' }}>{aiSuggestions.post_type_suggestion}</span> 
                | **Category:** <span style={{ fontWeight: 'bold', color: '#6a0dad' }}>{aiSuggestions.category}</span>
              </p>
              <p>
                **Keywords:** {aiSuggestions.tags.length > 0 ? aiSuggestions.tags.map(tag => `#${tag}`).join(', ') : 'None'}
              </p>
            </div>
          )}
        </div>
        {/* END NEW RENDER SECTION */}

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
            Current Radius: **{Math.round(radius)}** meters
          </div>
        </div>

        <button type="submit" disabled={isAnalyzing}>
          {isAnalyzing ? 'Analyzing...' : 'Create Post'}
        </button>
      </form>
    </div>
  );
};

export default CreatePost;