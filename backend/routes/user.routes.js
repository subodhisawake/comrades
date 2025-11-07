// backend/routes/user.routes.js
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const Post = require('../models/Post');  
const { validateGeoJSON } = require('../middleware/geoValidation');
const mongoose = require('mongoose');
const router = express.Router();

// Get complete user profile with activity
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const user = await User.findById(userId)
            .select('-password')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get user's posts
        const posts = await Post.find({ user: userId })
            .select('content location radius createdAt interactions comments')
            .sort('-createdAt');

        // Get interactions (help/rent/sell actions) MADE by the user (Responder side - for statistics/history)
        const interactions = await Post.aggregate([
            { $unwind: "$interactions" },
            { $match: { "interactions.user": userObjectId } },
            { $project: { 
                type: "$interactions.type",
                is_completed: "$interactions.is_completed", // Include completion status
                postId: "$_id",
                postContent: "$content",
                createdAt: "$interactions.createdAt"
            } 
            }
        ]);

        // --- UPDATED AGGREGATION: Get interactions RECEIVED on user's posts (Requester View) ---
        const interactionsReceived = await Post.aggregate([
            { $match: { user: userObjectId } }, // Match posts authored by the user (Requester)
            { $unwind: "$interactions" },
            // Interaction user is NOT the author
            { $match: { "interactions.user": { $ne: userObjectId } } }, 
            { $lookup: {
                from: "users",
                localField: "interactions.user",
                foreignField: "_id",
                as: "responder"
            }},
            { $unwind: "$responder" },
            { $project: {
                _id: "$interactions._id", // Use interaction ID
                type: "$interactions.type",
                // Completion fields
                is_completed: "$interactions.is_completed", 
                requester_confirmed: "$interactions.requester_confirmed",
                responder_confirmed: "$interactions.responder_confirmed",
                responder_rating: "$interactions.responder_rating",
                requester_rating: "$interactions.requester_rating",
                details: "$interactions.details",
                price: "$interactions.price",
                postId: "$_id",
                postContent: "$content",
                responderName: "$responder.name",
                createdAt: "$interactions.createdAt"
            }}
        ]);
        // -------------------------------------------------------------------------------------

        // --- NEW AGGREGATION: Get Pending Responder Confirmations (Responder View) ---
        const pendingResponderConfirmations = await Post.aggregate([
            { $unwind: "$interactions" },
            // Match interactions where the current user is the responder AND needs to confirm
            { $match: { 
                "interactions.user": userObjectId,
                "interactions.is_completed": false,
                "interactions.responder_confirmed": false // They haven't confirmed yet
            }},
            { $lookup: {
                from: "users",
                localField: "user", // The author of the post (the Requester)
                foreignField: "_id",
                as: "requester"
            }},
            { $unwind: "$requester" },
            { $project: {
                _id: "$interactions._id", // Use interaction ID
                type: "$interactions.type",
                // Completion fields
                is_completed: "$interactions.is_completed",
                requester_confirmed: "$interactions.requester_confirmed",
                responder_confirmed: "$interactions.responder_confirmed",
                responder_rating: "$interactions.responder_rating",
                requester_rating: "$interactions.requester_rating",
                // Other fields
                details: "$interactions.details",
                price: "$interactions.price",
                postId: "$_id",
                postContent: "$content",
                requesterName: "$requester.name", // Requester's name
                createdAt: "$interactions.createdAt"
            }}
        ]);
        // -------------------------------------------------------------------------------------


        // Get comments
        const comments = await Post.aggregate([
            { $unwind: "$comments" },
            { $match: { "comments.user": userObjectId } },
            { $project: { 
                comment: "$comments.content",
                postId: "$_id",
                postContent: "$content",
                createdAt: "$comments.createdAt"
            } 
            }
        ]);

        // Build statistics
        const statistics = {
            totalPosts: posts.length,
            totalInteractions: interactions.length, // Interactions MADE
            totalInteractionsReceived: interactionsReceived.length, // Interactions RECEIVED
            totalComments: comments.length,
            avgPostRadius: posts.reduce((acc, cur) => acc + cur.radius, 0) / posts.length || 0,
            lastActivity: posts[0]?.createdAt || user.createdAt
        };

        res.json({
            user,
            posts,
            interactions,
            interactionsReceived, 
            pendingResponderConfirmations, // <-- NEW: Include the pending list
            comments,
            statistics
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// --- NEW ROUTE: Toggle Shopkeeper Status ---
router.put('/profile/toggle-shopkeeper', authMiddleware, async (req, res) => {
    try {
        const { is_shopkeeper } = req.body;
        
        // Ensure the input is a boolean
        if (typeof is_shopkeeper !== 'boolean') {
            return res.status(400).json({ message: 'The is_shopkeeper field must be a boolean.' });
        }

        let updatePayload = { is_shopkeeper };

        // If the user is switching OFF shopkeeper status, clear their specialties
        if (is_shopkeeper === false) {
            updatePayload.seller_categories = [];
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            updatePayload,
            { 
                new: true, // Return the updated document
                select: 'is_shopkeeper seller_categories' // Only return relevant fields
            }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ 
            message: `User status updated to ${is_shopkeeper ? 'Shopkeeper' : 'Regular User'}.`,
            is_shopkeeper: updatedUser.is_shopkeeper,
            seller_categories: updatedUser.seller_categories // Will be empty if switched off
        });
    } catch (error) {
        console.error('Shopkeeper status update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// ----------------------------------------------------


// Update Seller Categories (existing route remains below)
router.put('/profile/seller-categories', authMiddleware, async (req, res) => {
    try {
        const { seller_categories } = req.body;
        
        // Basic validation: ensure the categories is an array of strings
        if (!Array.isArray(seller_categories) || seller_categories.some(c => typeof c !== 'string')) {
            return res.status(400).json({ message: 'Seller categories must be an array of strings.' });
        }
        
        // Sanitize categories (e.g., trim whitespace, remove duplicates)
        const cleanCategories = [...new Set(seller_categories.map(c => c.trim()).filter(c => c.length > 0))];

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { seller_categories: cleanCategories },
            { 
                new: true,
                runValidators: true,
                select: 'seller_categories'
            }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ 
            message: 'Seller categories updated successfully.',
            seller_categories: updatedUser.seller_categories
        });
    } catch (error) {
        console.error('Seller categories update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Update user location (remains unchanged)
router.put('/location', authMiddleware, validateGeoJSON, async (req, res) => {
    try {
        const { coordinates } = req.body;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { 
                location: {
                    type: 'Point',
                    coordinates: coordinates
                },
                $setOnInsert: { 
                    name: 'New User',
                    email: req.user.email
                }
            },
            { 
                new: true,
                runValidators: true,
                upsert: false,
                select: '-password -__v' 
            }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(updatedUser);
    } catch (error) {
        console.error('Location update error:', error);
        res.status(500).json({ 
            message: error.code === 16755
                ? 'Invalid coordinates format [longitude, latitude]'
                : 'Server error' 
        });
    }
});

module.exports = router;