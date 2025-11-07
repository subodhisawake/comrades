// backend/routes/post.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Post = require('../models/Post');
const User = require('../models/User');
const mongoose = require('mongoose');
const natural = require('natural'); 

// Initialize NLP tools (kept here for the /analyze-content route)
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const stopwords = ['i', 'a', 'the', 'is', 'for', 'need', 'to', 'can', 'will', 'want', 'looking', 'have'];

// Helper function for keyword extraction and stemming
const extractKeywords = (text) => {
    // ... (logic from previous step)
    const tokens = tokenizer.tokenize(text.toLowerCase());
    const keywords = tokens
        .filter(token => !stopwords.includes(token))
        .map(token => stemmer.stem(token))
        .filter(stem => stem.length > 2);
    const uniqueKeywords = [...new Set(tokens.filter(token => !stopwords.includes(token) && token.length > 2))];
    return uniqueKeywords;
};

// Helper function to re-calculate and update the User's score
// NOTE: This should run whenever a new interaction is mutually confirmed and rated.
const updateResponderReputation = async (responderId, newRating) => {
    const responder = await User.findById(responderId);

    if (!responder) return;

    // Calculate new total sum and count
    const newCount = responder.completed_transactions_count + 1;
    const newSum = responder.total_rating_sum + newRating;
    const newAverage = newSum / newCount;

    await User.findByIdAndUpdate(responderId, {
        completed_transactions_count: newCount,
        total_rating_sum: newSum,
        average_rating: newAverage
    });
};

// POST /analyze-content route (remains unchanged)
router.post('/analyze-content', authMiddleware, async (req, res) => {
    // ... (NLP categorization logic)
    try {
        const { content } = req.body;
        const lowerContent = content.toLowerCase();
        let post_type_suggestion = 'Help';
        let category = 'General';
        const keywords = extractKeywords(lowerContent);
        
        if (keywords.includes('rent') || keywords.includes('borrow')) {
            post_type_suggestion = 'Rent';
        } else if (keywords.includes('buy') || keywords.includes('sell') || keywords.includes('sale')) {
            post_type_suggestion = 'Sell';
        }
        
        if (keywords.includes('ladder') || keywords.includes('drill') || keywords.includes('tool')) {
            category = 'Tools & Equipment';
        } else if (keywords.includes('box') || keywords.includes('move') || keywords.includes('pack')) {
            category = 'Moving & Storage';
        } else if (keywords.includes('couch') || keywords.includes('table') || keywords.includes('chair')) {
             category = 'Furniture';
        }

        const aiCategorization = { post_type_suggestion, category, tags: keywords };
        res.json(aiCategorization);
    } catch (error) {
        console.error('AI content analysis error:', error);
        res.status(500).json({ message: 'Server error during analysis' });
    }
});


// Create a new post (remains unchanged)
router.post('/', authMiddleware, async (req, res) => {
    // ... (post creation logic)
    try {
        const { content, radius, ai_categorization } = req.body; 
        const user = await User.findById(req.user.id);
        
        if (!user?.location?.coordinates) {
            return res.status(400).json({ message: 'User location not set' });
        }

        const newPost = new Post({
            user: req.user.id,
            content,
            location: user.location,
            radius,
            ai_categorization: ai_categorization || { post_type_suggestion: 'Help', category: 'General', tags: [] } 
        });

        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        console.error('Post creation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// ------------------------------------------------
// UPDATED: Fetch Nearby Posts with AI Prioritization
// ------------------------------------------------
router.get('/nearby', authMiddleware, async (req, res) => {
    try {
        // Fetch the user's data, including the new seller_categories field
        const user = await User.findById(req.user.id).select('location coordinates seller_categories'); 
        
        if (!user?.location?.coordinates) {
            return res.status(400).json({ message: 'User location not available' });
        }

        // Get the shopkeeper's categories (if the field is present/populated)
        const userSellerCategories = user.seller_categories || []; 

        // The previous historical analysis is now simplified or replaced by the profile data
        // For now, we'll comment out the heavy historical analysis aggregation to prioritize the profile.
        /*
        const interactionTypes = await Post.aggregate([ ... ]);
        const userCategories = interactionTypes[0]?.categories || [];
        */
        const userCategories = []; // Using seller_categories instead

        const posts = await Post.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: user.location.coordinates },
                    distanceField: "distance",
                    maxDistance: 5000, 
                    spherical: true
                }
            },
            {
                $match: {
                    $expr: { $lte: ["$distance", "$radius"] },
                    user: { $ne: user._id } 
                }
            },
            // --- AI & PROFILE PRIORITIZATION LOGIC ---
            {
                $addFields: {
                    // NEW PRIMARY SCORE: Huge boost if the post's AI category 
                    // matches one of the user's declared seller_categories.
                    shopkeeperBoostScore: {
                        $cond: {
                            if: { 
                                $and: [
                                    { $ne: ["$ai_categorization.category", "General"] }, // Ignore general categories
                                    { $in: ["$ai_categorization.category", userSellerCategories] }
                                ]
                            },
                            then: 100, // Assign a very high score for a direct match
                            else: 0
                        }
                    },
                    // Secondary score (from previous update, kept for general relevance)
                    categoryMatchScore: {
                        $cond: {
                            if: { $in: ["$ai_categorization.category", userCategories] },
                            then: 1,
                            else: 0
                        }
                    },
                    typeBoostScore: {
                        $cond: {
                            if: { 
                                $or: [
                                    { $eq: ["$ai_categorization.post_type_suggestion", "Rent"] },
                                    { $eq: ["$ai_categorization.post_type_suggestion", "Sell"] }
                                ]
                            },
                            then: 1, 
                            else: 0
                        }
                    }
                }
            },
            // Sort to prioritize shopkeeper matches first
            {
                $sort: {
                    shopkeeperBoostScore: -1, // 1. Highest shopkeeper match (direct priority)
                    distance: 1,               // 2. Closest posts next
                    createdAt: -1              // 3. Newest posts last
                }
            },
            // --- END AI & PROFILE PRIORITIZATION LOGIC ---
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "author"
                }
            },
            { $unwind: "$author" },
            {
                $project: {
                    "author.password": 0,
                    "author.location": 0,
                    "author.email": 0
                }
            }
        ]);
        
        res.json(posts);
    } catch (error) {
        console.error('Error fetching nearby posts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/:postId/interact', authMiddleware, async (req, res) => {
    try {
      const { postId } = req.params;
      const { type, details, price } = req.body;
      
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
  
      const interaction = {
        type,
        user: req.user.id,
        details,
        price
      };
  
      post.interactions.push(interaction);
      await post.save();
  
      res.status(201).json(interaction);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  
  router.post('/:postId/comment', authMiddleware, async (req, res) => {
    try {
      const { postId } = req.params;
      const { content } = req.body;
      
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
  
      // FIX: Use explicit comparison logic to ensure the ObjectId (interaction.user)
      const hasInteracted = post.interactions.some(
        interaction => interaction.user && interaction.user.toString() === req.user.id
      );
  
      if (!hasInteracted) {
        return res.status(403).json({ message: 'You must interact with the post before commenting' });
      }
  
      // --- NEW: Comment Analysis Logic (NLP Integration) ---
      let comment_analysis = {
          is_toxic: false,
          intent: 'general',
          detected_price: null
      };

      const lowerContent = content.toLowerCase();

      // Toxicity/Warning Check
      if (lowerContent.includes('flake') || lowerContent.includes('scam') || lowerContent.includes('avoid')) {
          comment_analysis.is_toxic = true;
          comment_analysis.intent = 'warning';
      } 
      
      // Price/Offer Detection
      // Regex detects a number preceded by '$' or followed by 'dollars', 'bucks', or similar
      const priceMatch = lowerContent.match(/\$?\s*(\d+(\.\d{2})?)\s*(dollars|bucks)?/);
      if (priceMatch && priceMatch[1]) {
          comment_analysis.detected_price = parseFloat(priceMatch[1].replace(/[^0-9.]/g, ''));
          comment_analysis.intent = 'updated_offer';
      } else if (lowerContent.includes('how much') || lowerContent.includes('what size') || lowerContent.includes('price')) {
          comment_analysis.intent = 'question';
      }
      // --- END NEW ANALYSIS ---

      const comment = {
        user: req.user.id,
        content,
        analysis: comment_analysis // <--- Attach analysis here
      };
  
      post.comments.push(comment);
      await post.save();
  
      // Ensure the response data includes the user ID for the frontend update
      res.status(201).json({ ...comment, user: { _id: req.user.id, name: "You" } }); 
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  
  router.get('/:postId', authMiddleware, async (req, res) => {
    try {
      const post = await Post.findById(req.params.postId)
        .populate('user', 'name')
        .populate('interactions.user', 'name')
        .populate('comments.user', 'name');
      
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
  
      res.json(post);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.put('/:postId/complete', authMiddleware, async (req, res) => {
    const { postId } = req.params;
    const currentUserId = req.user.id;
    const { interactionId, role, rating } = req.body;
    
    try {
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const interaction = post.interactions.id(interactionId);
        if (!interaction) {
            return res.status(404).json({ message: 'Interaction not found' });
        }
        
        const postAuthorId = post.user.toString();
        const responderId = interaction.user.toString();
        
        let updateFields = {};
        let finalUpdate = false;

        // --- 1. Requester (Post Author) Confirmation ---
        if (role === 'requester' && currentUserId === postAuthorId) {
            // ... (existing requester logic)
            if (interaction.requester_confirmed) {
                 return res.status(400).json({ message: 'Requester already confirmed this transaction.' });
            }
            updateFields.requester_confirmed = true;
            
            // Requester rates the Responder (Seller/Helper)
            if (rating && rating >= 1 && rating <= 5) {
                updateFields.responder_rating = rating;
            } else {
                return res.status(400).json({ message: 'Requester must provide a rating (1-5).' });
            }
            
            // Check if the other party (Responder) has already confirmed
            if (interaction.responder_confirmed) {
                finalUpdate = true;
            }
        } 
        
        // --- 2. Responder (Seller/Helper) Confirmation ---
        else if (role === 'responder' && currentUserId === responderId) {
            // ... (existing responder logic)
            if (interaction.responder_confirmed) {
                return res.status(400).json({ message: 'Responder already confirmed this transaction.' });
            }
            updateFields.responder_confirmed = true;
            
            // Responder rates the Requester (optional, for requester ranking later)
            if (rating && rating >= 1 && rating <= 5) {
                updateFields.requester_rating = rating;
            }

            // Check if the other party (Requester) has already confirmed
            if (interaction.requester_confirmed) {
                finalUpdate = true;
            }
        } 
        
        // --- 3. Authorization Check ---
        else {
            return res.status(403).json({ message: 'Not authorized to confirm this role.' });
        }

        // Apply immediate updates to the interaction subdocument
        Object.assign(interaction, updateFields);

        // --- 4. Finalize Transaction, Update Score, and Delete Post ---
        if (finalUpdate) {
            interaction.is_completed = true;
            interaction.completion_date = new Date();
            
            // Trigger AI/Reputation Score Update
            await updateResponderReputation(responderId, updateFields.responder_rating || interaction.responder_rating);

            // ⚠️ CRITICAL STEP: DELETE THE POST AFTER SUCCESSFUL COMPLETION
            await Post.findByIdAndDelete(postId);
            
            return res.json({ 
                message: 'Transaction successfully finalized, score updated, and post deleted.',
                interaction: interaction,
                postDeleted: true // Flag for frontend to remove the post
            });
        }

        await post.save();
        
        res.json({ 
            message: `Transaction confirmation successful. Awaiting confirmation from the other party.`,
            interaction: interaction,
            postDeleted: false
        });

    } catch (error) {
        console.error('Transaction finalization error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;