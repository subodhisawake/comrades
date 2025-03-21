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
    price: Number // For rent and sell options
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
    }
  }, { timestamps: true });

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
    min: 1,
    max: 1000 // Maximum radius in meters
  },
  interactions: [interactionSchema],
  comments: [commentSchema],
}, { timestamps: true });

postSchema.index({ location: '2dsphere' }); // Enable geospatial queries

module.exports = mongoose.model('Post', postSchema);
