// src/components/Feed.js
import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import PostCard from './PostCard';
import './../styles/Feed.css';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const response = await api.get('/posts/nearby');
        setPosts(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchPosts();
  }, [user]);

  // --- handleInteraction (Minimal Change to the Optimistic Update) ---
  const handleInteraction = async (postId, type, details, price) => { 
    try {
      // Backend call with necessary data
      const response = await api.post(`/posts/${postId}/interact`, { type, details, price });
      
      // Use the full interaction object returned by the server
      const newInteraction = response.data;
      
      const updatedPosts = posts.map(post => 
        post._id === postId ? 
        { 
             ...post, 
             interactions: [
                 ...post.interactions, 
                 // Ensure the user property is an object with name/id for display in PostCard
                 { ...newInteraction, user: { _id: user._id, name: user.name } } 
             ] 
        } : 
        post
      );
      setPosts(updatedPosts);
      // Optional: Give visual feedback that interaction was successful
      alert(`Successfully registered ${type} interaction!`); 
    } catch (error) {
      console.error('Interaction failed:', error);
      alert('Failed to interact. Check console for details.');
    }
  };
  // ---------------------------------

  const handleComment = async (postId, content) => {
    try {
      const response = await api.post(`/posts/${postId}/comment`, { content });
      const updatedPosts = posts.map(post => 
        post._id === postId ? 
        // This logic is correct: use the response data
        { ...post, comments: [...post.comments, response.data] } : 
        post
      );
      setPosts(updatedPosts);
    } catch (error) {
      console.error('Comment failed:', error);
    }
  };

  if (!user) return <div className="auth-message">Please log in to view your feed.</div>;

  return (
    <div className="feed-container">
      <h1>Nearby Posts</h1>
      {loading && <div className="loading">Loading posts...</div>}
      {error && <div className="error">{error}</div>}
      
      <div className="posts-list">
        {posts.map(post => (
          <PostCard 
            key={post._id} 
            post={post} 
            user={user}
            onInteraction={handleInteraction}
            onComment={handleComment}
          />
        ))}
      </div>
      
      {!loading && !error && posts.length === 0 && (
        <div className="no-posts">No nearby posts found.</div>
      )}
    </div>
  );
};

export default Feed;