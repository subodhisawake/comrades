import React from 'react';
import { Link } from 'react-router-dom';
import './PostCard.css';

const PostCard = ({ post }) => {
  return (
    <div className="post-card">
      <h3>{post.content}</h3>
      <p>Radius: {post.radius}m</p>
      <p>Interactions: {post.interactions.length}</p>
      <p>Comments: {post.comments.length}</p>
      <Link to={`/post/${post._id}`} className="view-details-btn">View Details</Link>
    </div>
  );
};

export default PostCard;
