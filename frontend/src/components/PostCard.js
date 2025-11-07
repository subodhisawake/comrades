import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import './../styles/PostCard.css';

const PostCard = ({ post, user, onInteraction, onComment }) => {
  const [commentContent, setCommentContent] = useState('');
  
  // Check if the current user has already interacted with the post (used only for commenting permission)
  const hasInteracted = post.interactions.some(i => i.user === user._id || i.user?._id === user._id); 
  
  // Check if the current user is the author of the post
  const isAuthor = post.user === user._id || post.author._id === user._id;

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (commentContent.trim()) {
      onComment(post._id, commentContent.trim());
      setCommentContent('');
    }
  };

  // --- INTERACTION HANDLER: (Remains unchanged - captures data via prompt) ---
  const handleInteractionWithDetails = (type) => {
      let details = '';
      let price = null;
      let promptMessage = '';
      
      if (type === 'help') {
          details = prompt('Enter details for your assistance offer (e.g., I can be there in 10 mins):');
      } else if (type === 'rent' || type === 'sell') {
          promptMessage = `Enter specific details for your ${type.toUpperCase()} offer (e.g., condition, availability, etc.):`;
          details = prompt(promptMessage);
          
          if (!details) return;

          const priceInput = prompt(`Enter price for ${type.toUpperCase()} (e.g., 5.00):`);
          if (priceInput !== null && priceInput.trim() !== '') {
              price = parseFloat(priceInput.replace(/[^0-9.]/g, ''));
          } else if (type !== 'help') {
               alert(`Price is recommended for ${type.toUpperCase()}. Submitting without price.`);
          }
      }
      
      if (details) {
          onInteraction(post._id, type, details, price);
      }
  };
  // ----------------------------------------------------------------------------

  const interactionTypeStyle = (type) => {
    switch (type) {
      case 'help': return { backgroundColor: '#4CAF50', color: 'white' };
      case 'rent': return { backgroundColor: '#2196F3', color: 'white' };
      case 'sell': return { backgroundColor: '#FF9800', color: 'white' };
      default: return {};
    }
  };

  const commentAnalysisStyle = (analysis) => {
      if (analysis.is_toxic || analysis.intent === 'warning') {
          return { backgroundColor: '#fdd', borderLeft: '3px solid red' };
      }
      if (analysis.intent === 'updated_offer') {
          return { backgroundColor: '#e6ffe6', borderLeft: '3px solid green' };
      }
      return {};
  };

  // Filter interactions to show only the relevant, active offers for the public view
  const activeOffers = post.interactions.filter(i => 
    i.type !== 'help' && !i.is_completed // Only show Rent/Sell offers that aren't finished
  );

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="author-info">
          <h3>{post.author && post.author.name ? post.author.name : 'Anonymous'}</h3>
          <span className="post-distance">
            {post.distance !== undefined ? `${Math.round(post.distance)}m away` : 'Distance unknown'} • {post.createdAt ? formatDistanceToNow(new Date(post.createdAt)) + ' ago' : 'Just now'}
          </span>
        </div>
        <div className="post-radius">Radius: {post.radius}m</div>
      </div>

      <div className="post-content">
        <p>{post.content}</p>
      </div>
      
      {/* --- PUBLIC SECTION: Display Competitive Offers --- */}
      {/* Show this section to everyone (non-author view) */}
      {!isAuthor && activeOffers.length > 0 && (
          <div className="competitive-offers-list" style={{ marginTop: '10px', padding: '10px', border: '1px solid #eee' }}>
              <h4>Current Market Offers: ({activeOffers.length})</h4>
              {activeOffers.map((interaction, index) => (
                  <div key={index} style={{ marginBottom: '5px', padding: '5px', borderBottom: '1px dotted #ccc' }}>
                      <span className="offer-type" style={{ ...interactionTypeStyle(interaction.type), padding: '2px 5px', borderRadius: '3px', fontSize: '0.8em' }}>
                          {interaction.type.toUpperCase()}
                      </span>
                      {interaction.price && (
                          <strong style={{ marginLeft: '10px', color: 'darkgreen' }}>
                              Price: ${interaction.price.toFixed(2)}
                          </strong>
                      )}
                      <p style={{ margin: '3px 0 0', fontSize: '0.9em' }}>
                          Details: {interaction.details || 'N/A'}
                      </p>
                  </div>
              ))}
          </div>
      )}
      {/* --- END PUBLIC SECTION --- */}

      {/* --- AUTHOR SECTION: Detailed Offers Received (No change needed) --- */}
      {isAuthor && post.interactions.length > 0 && (
        <div className="author-interactions-list">
          <h4>🤝 Offers Received: ({post.interactions.length})</h4>
          {post.interactions.map((interaction, index) => (
            <div key={index} className="interaction-offer">
              <span className="offer-type" style={interactionTypeStyle(interaction.type)}>
                {interaction.type.toUpperCase()}
              </span>
              <strong>
                  {interaction.user && interaction.user.name ? interaction.user.name : 'Unknown User'} 
                  {interaction.responder_rating && ` (Rated ${interaction.responder_rating}/5)`} 
              </strong>
              <p>{interaction.details || 'No specific details provided.'}</p>
              {interaction.price && <p>Price Offered: **${interaction.price.toFixed(2)}**</p>}
              <span className="offer-time">
                {interaction.createdAt ? formatDistanceToNow(new Date(interaction.createdAt)) + ' ago' : 'Just now'}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Enable Multiple Interactions */}
      {!isAuthor && (
          <div className="interactions">
            <button onClick={() => handleInteractionWithDetails('help')}>Help</button>
            <button onClick={() => handleInteractionWithDetails('rent')}>Rent</button>
            <button onClick={() => handleInteractionWithDetails('sell')}>Sell</button>
          </div>
      )}

      {/* Comment Section (Remains active for negotiation and post-offer questions) */}
      <div className="comments-section">
        <div className="comments-list">
          {post.comments.map((c, index) => (
            <div key={index} className="comment" style={commentAnalysisStyle(c.analysis || {})}>
              <strong>{c.user && c.user.name ? c.user.name : 'Anonymous'}:</strong>
              
              {c.analysis?.intent === 'updated_offer' && (
                  <span style={{ color: 'green', fontWeight: 'bold', marginLeft: '10px' }}>
                      💰 OFFER: ${c.analysis.detected_price?.toFixed(2)}
                  </span>
              )}
              {c.analysis?.intent === 'warning' && (
                  <span style={{ color: 'red', fontWeight: 'bold', marginLeft: '10px' }}>
                      ⚠️ WARNING
                  </span>
              )}

              <p>{c.content}</p>
              <span className="comment-time">
                {c.createdAt ? formatDistanceToNow(new Date(c.createdAt)) + ' ago' : 'Just now'}
              </span>
            </div>
          ))}
        </div>

        {/* Comment form is for negotiation/questions after initial offer */}
        {(isAuthor || hasInteracted) && (
          <form onSubmit={handleCommentSubmit} className="comment-form">
            <input
              type="text"
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Write a comment or negotiate terms..."
              required
            />
            <button type="submit">Post</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PostCard;