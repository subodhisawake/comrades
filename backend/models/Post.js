const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['help', 'rent', 'sell'],
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    details: String,
    price: Number, // For rent and sell options
    
    // --- FIELDS FOR TRANSACTION COMPLETION & REPUTATION ---
    is_completed: { 
        type: Boolean, 
        default: false,
    },
    completion_date: { 
        type: Date 
    },
    
    requester_confirmed: { 
        type: Boolean, 
        default: false 
    },
    responder_confirmed: { 
        type: Boolean, 
        default: false 
    },
    
    responder_rating: { 
        type: Number, 
        min: 1, 
        max: 5 
    }, 
    responder_rating: { 
        type: Number, 
        min: 1, 
        max: 5 
    }, 
}, { timestamps: true });
 
const commentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    // --- NEW FIELD FOR AI ANALYSIS ---
    analysis: {
        is_toxic: { 
            type: Boolean, 
            default: false 
        },
        intent: { 
            type: String, 
            enum: ['general', 'question', 'updated_offer', 'warning'], 
            default: 'general' 
        },
        detected_price: { 
            type: Number, 
            default: null 
        }
    }
    // ----------------------------------
}, { timestamps: true });

const aiCategorizationSchema = new mongoose.Schema({
    post_type_suggestion: { 
        type: String, 
        enum: ['Help', 'Rent', 'Sell', 'General'], 
        default: 'General' 
    },
    category: { 
        type: String, 
        default: 'General' 
    },
    tags: [String],
});


const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    ai_categorization: {
        type: aiCategorizationSchema,
        default: () => ({})
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    radius: {
        type: Number,
        required: true,
        min: 100,
        max: 15000
    },
    interactions: [interactionSchema],
    comments: [commentSchema],
}, { timestamps: true });

postSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Post', postSchema);