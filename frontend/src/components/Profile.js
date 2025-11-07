import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import './../styles/Profile.css';

// Simple debounce utility function (must be defined or imported)
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(null, args);
    }, delay);
  };
};

// --- Component: Interaction Completion Manager ---
const InteractionCompletionManager = ({ interaction, postId, isAuthor, isResponder, onComplete, currentUserId }) => {
    // START HOOK CALLS HERE (MUST BE UNCONDITIONAL)
    const [rating, setRating] = useState(5); 
    const [isSubmitting, setIsSubmitting] = useState(false); 
    const [message, setMessage] = useState(''); 
    
    // Check flags
    const requesterConfirmed = interaction.requester_confirmed;
    const responderConfirmed = interaction.responder_confirmed;

    // --- RENDER CHECKS ---
    if (!isAuthor && !isResponder) return null; 
    
    // Finalized State
    if (interaction.is_completed) {
        return (
            <div style={{ color: '#4CAF50', fontWeight: 'bold', marginTop: '5px' }}>
                🎉 TRANSACTION COMPLETED!
                {interaction.responder_rating && <span> (Score: {interaction.responder_rating} / 5)</span>}
            </div>
        );
    }
    
    // --- Determine Role and Current Confirmation Status ---
    const userRole = isAuthor ? 'requester' : 'responder';
    const isConfirmedByCurrentUser = isAuthor ? requesterConfirmed : responderConfirmed;
    
    const awaitingConfirmationFrom = isAuthor 
        ? (responderConfirmed ? null : interaction.responderName) 
        : (requesterConfirmed ? null : 'Requester');


    // --- Submission Logic ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isConfirmedByCurrentUser) return;

        // Requester must provide a rating; Responder rating is optional
        if (userRole === 'requester' && (rating < 1 || rating > 5)) {
            setMessage("Requester must provide a rating (1-5).");
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const payload = {
                interactionId: interaction._id,
                role: userRole,
                rating: rating 
            };

            const response = await api.put(`/posts/${postId}/complete`, payload);

            onComplete(interaction._id, response.data.interaction);
            setMessage(response.data.message);
        } catch (error) {
            console.error('Completion error:', error);
            setMessage(error.response?.data?.message || 'Failed to complete transaction.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // --- Render Awaiting Confirmation (Partial Completion) ---
    if (isConfirmedByCurrentUser) {
        return (
            <div style={{ color: '#FF9800', fontWeight: 'bold', marginTop: '5px' }}>
                Awaiting confirmation from {awaitingConfirmationFrom}.
            </div>
        );
    }


    // --- Render Form to Confirm ---
    return (
        <form onSubmit={handleSubmit} style={{ marginTop: '10px', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '5px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Action Required:</p>
            
            {userRole === 'requester' ? (
                // Requester (Author) view: Requires rating the Responder
                <label style={{ display: 'block', marginBottom: '5px' }}>
                    Rate **{interaction.responderName}** (1-5):
                    <input
                        type="number"
                        min="1"
                        max="5"
                        value={rating}
                        onChange={(e) => setRating(parseInt(e.target.value))}
                        required
                        style={{ width: '50px', marginLeft: '10px' }}
                    />
                </label>
            ) : (
                // Responder view: Confirmation only 
                <p>Please confirm that the transaction was completed with **{interaction.requesterName}**.</p>
            )}
            
            <button type="submit" disabled={isSubmitting} style={{ backgroundColor: '#673AB7', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '3px', cursor: 'pointer' }}>
                {isSubmitting 
                    ? 'Confirming...' 
                    : userRole === 'requester' ? 'Mark Complete & Rate' : 'Confirm Transaction'}
            </button>
            {message && <p style={{ fontSize: '0.8em', color: message.includes('Failed') ? 'red' : 'green' }}>{message}</p>}
        </form>
    );
};
// -------------------------------------------------------------------


// --- New Component: Status Toggler (omitted for brevity, remains unchanged)
const ShopkeeperStatusToggle = ({ isShopkeeper, onStatusChange }) => {
    // ... existing logic
    const [isToggling, setIsToggling] = useState(false);
    
    const handleToggle = async () => {
        setIsToggling(true);
        const newStatus = !isShopkeeper;
        try {
            await api.put('/users/profile/toggle-shopkeeper', { is_shopkeeper: newStatus });
            onStatusChange(newStatus);
        } catch (error) {
            console.error('Error toggling status:', error);
            alert('Failed to update shopkeeper status.');
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <div className="shopkeeper-toggle-section" style={{ marginTop: '10px' }}>
            <p>
                **Status:** {isShopkeeper ? '✅ Shopkeeper/Seller' : '👤 Regular User'}
            </p>
            <button onClick={handleToggle} disabled={isToggling}>
                {isToggling 
                    ? 'Updating...' 
                    : isShopkeeper ? 'Switch to Regular User' : 'Become a Shopkeeper'}
            </button>
        </div>
    );
};


// --- UPDATED Component: SellerCategoriesEditor (omitted for brevity, remains unchanged)
const SellerCategoriesEditor = ({ initialCategories, onUpdate }) => {
    // ... existing logic (omitted for brevity)
    const [descriptionInput, setDescriptionInput] = useState(''); // Text area holds ONLY description
    const [finalCategories, setFinalCategories] = useState(initialCategories); // State holds final, standardized categories
    
    const [isSaving, setIsSaving] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false); 
    const [message, setMessage] = useState('');
    const [suggestions, setSuggestions] = useState([]); 

    const fetchSuggestions = async (text) => {
        if (text.trim().length < 5) {
            setSuggestions([]);
            return;
        }

        setIsSuggesting(true);
        try {
            const response = await api.post('/users/profile/suggest-categories', { text });
            const newSuggestions = response.data.suggestions.filter(s => !finalCategories.includes(s));
            setSuggestions(newSuggestions);
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
            setSuggestions([]);
        } finally {
            setIsSuggesting(false);
        }
    };

    const debouncedFetchSuggestions = useCallback(
        debounce(fetchSuggestions, 500),
        []
    );

    const handleInputChange = (e) => {
        const newText = e.target.value;
        setDescriptionInput(newText);
        debouncedFetchSuggestions(newText);
    };

    const handleSuggestionClick = (suggestion) => {
        setFinalCategories(prev => [...prev, suggestion]);
        setSuggestions(prev => prev.filter(s => s !== suggestion));
        setDescriptionInput('');
    };

    const handleCategoryRemove = (category) => {
        setFinalCategories(prev => prev.filter(c => c !== category));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage('');

        const categoriesToSend = finalCategories; 

        try {
            const response = await api.put('/users/profile/seller-categories', {
                seller_categories: categoriesToSend
            });
            
            setMessage('Categories updated! Your feed will now be prioritized.');
            onUpdate(response.data.seller_categories); 
            setSuggestions([]); 
        } catch (error) {
            console.error('Error updating categories:', error);
            setMessage('Failed to update categories. Please try again.');
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage(''), 5000); 
        }
    };

    return (
        <div className="seller-editor">
            <form onSubmit={handleSubmit}>
                <label htmlFor="description-input">
                    **What do you sell?** (Type a description below to get category suggestions)
                </label>
                <textarea
                    id="description-input"
                    value={descriptionInput}
                    onChange={handleInputChange} 
                    placeholder="E.g., We stock all types of ladders and power tools."
                    rows="2"
                />
                
                {/* Display Suggestions */}
                {isSuggesting && <p style={{ margin: '5px 0', color: '#007bff' }}>Analyzing text...</p>}
                {suggestions.length > 0 && (
                    <div style={{ margin: '10px 0', fontSize: '0.9em' }}>
                        **Click to Add:** {suggestions.map(s => (
                            <button 
                                key={s} 
                                type="button" 
                                onClick={() => handleSuggestionClick(s)}
                                style={{ 
                                    margin: '0 5px 5px 0', 
                                    padding: '5px 10px',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer'
                                }}
                            >
                                + {s}
                            </button>
                        ))}
                    </div>
                )}

                {/* Display Final Categories as Tags */}
                <div style={{ margin: '15px 0', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '30px' }}>
                    **Specialties to Save:**
                    {finalCategories.length === 0 && <span style={{ color: '#888', marginLeft: '10px' }}>None selected.</span>}
                    {finalCategories.map(c => (
                        <span 
                            key={c}
                            style={{
                                display: 'inline-block',
                                margin: '5px',
                                padding: '5px 10px',
                                backgroundColor: '#f0f0f0',
                                border: '1px solid #ddd',
                                borderRadius: '15px',
                                fontSize: '0.9em',
                                cursor: 'pointer'
                            }}
                            onClick={() => handleCategoryRemove(c)}
                        >
                            {c} ⓧ
                        </span>
                    ))}
                </div>
                
                <button type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Categories'}
                </button>
            </form>
            {message && <p className={`status-message ${message.includes('Failed') ? 'error' : 'success'}`}>{message}</p>}
        </div>
    );
};


const Profile = () => {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/users/profile');
                setProfileData(response.data);
            } catch (err) {
                console.error('Error fetching profile:', err);
                setError('Failed to load profile. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleCategoriesUpdate = (newCategories) => {
        setProfileData(prevData => ({
            ...prevData,
            user: {
                ...prevData.user,
                seller_categories: newCategories
            }
        }));
    };

    const handleStatusUpdate = (newStatus) => {
        setProfileData(prevData => ({
            ...prevData,
            user: {
                ...prevData.user,
                is_shopkeeper: newStatus,
                ...(newStatus === false && { seller_categories: [] }) 
            }
        }));
    };
    
    // --- NEW HANDLER ---
    // Updates a specific interaction in the interactionsReceived array
    const handleTransactionComplete = (interactionId, responseData) => {
    // responseData is the full API response body, e.g., { message: ..., interaction: {...}, postDeleted: true }
    const updatedInteractionDetails = responseData.interaction;
    const postWasDeleted = responseData.postDeleted === true;

    setProfileData(prevData => {
        let postIdToRemove = null;

        // 1. Find the Post ID to potentially remove it from the main post list
        // We assume the interaction objects in the profile state contain a 'postId' field.
        const interactionInReceived = prevData.interactionsReceived.find(i => i._id === interactionId);
        if (interactionInReceived) {
            postIdToRemove = interactionInReceived.postId;
        } else {
            const interactionInPending = prevData.pendingResponderConfirmations.find(i => i._id === interactionId);
            if (interactionInPending) postIdToRemove = interactionInPending.postId;
        }

        // 2. Update the interaction status (Applies to both pending completion and finalization)
        const updateInteractionList = (list) => 
            list.map(i => i._id === interactionId ? { ...i, ...updatedInteractionDetails } : i);

        let newInteractionsReceived = updateInteractionList(prevData.interactionsReceived);
        let newPendingResponderConfirmations = updateInteractionList(prevData.pendingResponderConfirmations);
        
        // 3. If the transaction is finalized and the post was deleted:
        if (postWasDeleted && postIdToRemove) {
            
            // a) Remove the post from the main post list
            const newPosts = prevData.posts.filter(p => p._id !== postIdToRemove);

            // b) Filter the completed interaction out of the tracking lists
            newInteractionsReceived = newInteractionsReceived.filter(i => i._id !== interactionId);
            newPendingResponderConfirmations = newPendingResponderConfirmations.filter(i => i._id !== interactionId);

            return {
                ...prevData,
                posts: newPosts,
                interactionsReceived: newInteractionsReceived,
                pendingResponderConfirmations: newPendingResponderConfirmations
            };
        }

        // 4. If the post was NOT deleted (i.e., awaiting second confirmation), just update the status
        return {
            ...prevData,
            interactionsReceived: newInteractionsReceived,
            pendingResponderConfirmations: newPendingResponderConfirmations
        };
    });
};
    // -------------------


    if (loading) return <div className="loading">Loading profile...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!profileData?.user) return <div>No user data found</div>;

    // --- UPDATED DESTRUCTURING ---
    const { user, posts, interactions, interactionsReceived, pendingResponderConfirmations, comments, statistics } = profileData;
    // ----------------------------
    
    const interactionTypeStyle = (type) => {
        switch (type) {
            case 'help': return { color: '#4CAF50', fontWeight: 'bold' }; 
            case 'rent': return { color: '#2196F3', fontWeight: 'bold' }; 
            case 'sell': return { color: '#FF9800', fontWeight: 'bold' }; 
            default: return {};
        }
    };

    // Helper to find the post ID associated with a received interaction (Required for API call)
    // NOTE: This now checks both lists for the postId
    const findPostId = (interactionId) => {
        let interaction = interactionsReceived.find(i => i._id === interactionId);
        if (interaction) return interaction.postId;

        interaction = pendingResponderConfirmations.find(i => i._id === interactionId);
        if (interaction) return interaction.postId;

        return null;
    };


    return (
        <div className="profile-container">
            <div className="profile-header">
                <h1>{user?.name || 'Anonymous'}</h1>
                <p>{user?.email || 'Email not available'}</p>
                <p>Account Created: {new Date(user?.createdAt).toLocaleDateString()}</p>
                <p>
                    {user?.location?.coordinates 
                        ? `Location: ${user.location.coordinates.join(', ')}` 
                        : 'Location not set'}
                </p>
            </div>

            <hr/>

            {/* Shopkeeper Toggle and Conditional Editor */}
            <div className="profile-section seller-categories-section">
                <h2>🛍️ Profile Type</h2>
                <ShopkeeperStatusToggle 
                    isShopkeeper={user.is_shopkeeper || false}
                    onStatusChange={handleStatusUpdate}
                />
                
                {user.is_shopkeeper && (
                    <>
                        <p style={{ marginTop: '15px' }}>**Current Specialties:** {user.seller_categories && user.seller_categories.length > 0
                            ? user.seller_categories.join(', ')
                            : 'None set. Set them below to get prioritized feed matching!'}</p>
                        <SellerCategoriesEditor 
                            initialCategories={user.seller_categories || []}
                            onUpdate={handleCategoriesUpdate}
                        />
                    </>
                )}
            </div>

            <hr/>

            {/* --- SECTION: Pending Confirmations (RESPONDER VIEW) --- */}
            <div className="profile-section">
                <h2>🚨 Transactions to Confirm (As Responder)</h2>
                {pendingResponderConfirmations.length > 0 ? (
                    pendingResponderConfirmations.map(interaction => {
                        const postId = findPostId(interaction._id);

                        return (
                            <div key={interaction._id} className="interaction-made-item" style={{ borderLeft: '3px solid #FF9800', paddingLeft: '10px', marginBottom: '15px' }}>
                                <p>
                                    **Post:** {interaction.postContent} 
                                    <span style={interactionTypeStyle(interaction.type)}> [{interaction.type.toUpperCase()}]</span>
                                </p>
                                <p>**Requester:** {interaction.requesterName || 'Anonymous'}</p>
                                
                                {/* Status Check */}
                                {interaction.requester_confirmed ? (
                                    <p style={{ color: '#4CAF50', fontWeight: 'bold' }}>Status: Requester Confirmed! Action required from you.</p>
                                ) : (
                                    <p style={{ color: '#FF9800', fontWeight: 'bold' }}>Status: Awaiting Requester's initial confirmation.</p>
                                )}
                                
                                <InteractionCompletionManager 
                                    interaction={interaction}
                                    postId={postId}
                                    isAuthor={false} // User is NOT the Author
                                    isResponder={true} // User IS the Responder (current list context)
                                    currentUserId={user._id}
                                    onComplete={handleTransactionComplete}
                                />
                            </div>
                        );
                    })
                ) : (
                    <p>No transactions require your confirmation right now.</p>
                )}
            </div>
            
            <hr/>
            {/* -------------------------------------------------------- */}


            {/* --- SECTION: Interactions Received (REQUESTER VIEW) --- */}
            <div className="profile-section">
                <h2>🤝 Interactions Received (Action Required)</h2>
                {interactionsReceived.length > 0 ? (
                    interactionsReceived.map(interaction => {
                        // Find the post ID for this interaction (required for the API call)
                        const postId = findPostId(interaction._id);

                        return (
                            <div key={interaction._id} className="interaction-received-item" style={{ borderLeft: '3px solid #673AB7', paddingLeft: '10px', marginBottom: '15px' }}>
                                <p>
                                    **From:** {interaction.responderName || 'Anonymous'} 
                                    <span style={interactionTypeStyle(interaction.type)}> [{interaction.type.toUpperCase()}]</span>
                                </p>
                                <p>**On Post:** {interaction.postContent}</p>
                                {interaction.details && <p>**Details:** {interaction.details}</p>}
                                {interaction.price && <p>**Price:** ${interaction.price.toFixed(2)}</p>}
                                <p>Date: {new Date(interaction.createdAt).toLocaleDateString()}</p>
                                
                                <InteractionCompletionManager 
                                    interaction={interaction}
                                    postId={postId}
                                    isAuthor={true} // Hardcoded true because this section IS for the author
                                    isResponder={false} // Hardcoded false because this is the author's view
                                    currentUserId={user._id}
                                    onComplete={handleTransactionComplete}
                                />
                            </div>
                        );
                    })
                ) : (
                    <p>No offers or help requests received on your posts yet.</p>
                )}
            </div>
            
            <hr/>
            {/* ----------------------------------------- */}

            <div className="profile-section">
                <h2>Your Posts</h2>
                {posts.length > 0 ? (
                    posts.map(post => (
                        <div key={post._id} className="post-item">
                            {post.ai_categorization?.category && (
                                <span className="ai-category-tag" style={{ color: '#007bff', fontWeight: 'bold' }}>[{post.ai_categorization.category}] </span>
                            )}
                            <p>{post.content} (Radius: {post.radius}m)</p>
                            <p>Created: {new Date(post.createdAt).toLocaleDateString()}</p>
                        </div>
                    ))
                ) : (
                    <p>No posts found.</p>
                )}
            </div>
            
            <hr/>

            <div className="profile-section">
                <h2>Your Interactions (Made)</h2>
                {interactions.length > 0 ? (
                    interactions.map(interaction => {
                        return (
                            <div key={interaction._id} className="interaction-item" style={{ borderLeft: '3px solid #FF9800', paddingLeft: '10px', marginBottom: '10px' }}>
                                <p>Interacted with: **{interaction.postContent}**</p>
                                <p>Type: {interaction.type}</p>
                                <p>Date: {new Date(interaction.createdAt).toLocaleDateString()}</p>
                                <p style={{ fontWeight: 'bold', color: interaction.is_completed ? '#4CAF50' : '#FF9800' }}>
                                    Status: {interaction.is_completed ? 'Completed' : 'Pending Confirmation'}
                                </p>
                            </div>
                        )
                    })
                ) : (
                    <p>No interactions found.</p>
                )}
            </div>
            
            <hr/>

            <div className="profile-section">
                <h2>Your Comments</h2>
                {comments.length > 0 ? (
                    comments.map(comment => (
                        <div key={comment._id} className="comment-item">
                            <p>Commented on: {comment.postContent}</p>
                            <p>Comment: {comment.comment}</p>
                            <p>Date: {new Date(comment.createdAt).toLocaleDateString()}</p>
                        </div>
                    ))
                ) : (
                    <p>No comments found.</p>
                )}
            </div>
            
            <hr/>

            <div className="profile-section">
                <h2>Statistics</h2>
                {statistics ? (
                    <>
                        <p>Total Posts: {statistics.totalPosts}</p>
                        <p>Total Interactions (Made): {statistics.totalInteractions}</p>
                        <p>Total Interactions (Received): {statistics.totalInteractionsReceived}</p>
                        <p>Total Comments: {statistics.totalComments}</p>
                        <p>Average Post Radius: {Math.round(statistics.avgPostRadius)}m</p>
                        <p>Last Activity: {new Date(statistics.lastActivity).toLocaleDateString()}</p>
                        <p style={{marginTop: '10px'}}>
                            **Your Seller Score:** {user.average_rating ? `${user.average_rating.toFixed(2)}/5.0` : 'N/A'} (Completed: {user.completed_transactions_count})
                        </p>
                    </>
                ) : (
                    <p>No statistics available.</p>
                )}
            </div>
        </div>
    );
};

export default Profile;