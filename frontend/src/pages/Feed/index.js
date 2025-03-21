// src/pages/Feed/index.js
import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import PostCard from '../../components/posts/PostCard';
import './Feed.css';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const response = await api.get('/posts/nearby'); // Fetch posts within the user's vicinity
        setPosts(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchPosts();
    }
  }, [user]);

  if (!user) {
    return <p>Please log in to view your feed.</p>;
  }

  return (
    <div className="feed-container">
      <h1>Nearby Posts</h1>
      {loading && <p>Loading posts...</p>}
      {error && <p className="error-message">{error}</p>}
      {!loading && !error && (
        <div className="posts-grid">
          {posts.length > 0 ? (
            posts.map(post => <PostCard key={post._id} post={post} />)
          ) : (
            <p>No nearby posts found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Feed;
