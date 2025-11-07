// backend/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    // NEW FIELD: Flag to designate a user as a commercial entity/shopkeeper
    is_shopkeeper: {
        type: Boolean,
        default: false,
    },
    // Existing seller_categories field
    seller_categories: {
        type: [String],
        default: [],
        index: true 
    },
    // --- NEW FIELDS FOR REPUTATION SCORING ---
    // Total number of successfully completed interactions (Responder side)
    completed_transactions_count: {
        type: Number,
        default: 0
    },
    // Sum of all ratings received from Requesters (for calculating average)
    total_rating_sum: {
        type: Number,
        default: 0
    },
    // AI-driven average rating (total_rating_sum / completed_transactions_count)
    average_rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    // ------------------------------------------
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
        },
    },
    refreshToken: String,
    refreshTokenExpires: Date
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);