const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Post = require('../models/Post');
const User = require('../models/User');

// Create a new post
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content, radius } = req.body;
    const user = await User.findById(req.user.id);
    
    const newPost = new Post({
      user: req.user.id,
      content,
      location: user.location,
      radius
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get posts where user is within the post's radius
router.get('/nearby', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const posts = await Post.aggregate([
      {
        $geoNear: {
          near: user.location,
          distanceField: "distance",
          maxDistance: 10000, // Maximum search radius (10km)
          spherical: true,
          query: { 
            // Optional additional filters
          }
        }
      },
      {
        $match: {
          $expr: { $lte: ["$distance", "$radius"] } // Filter by post's radius
        }
      },
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
          "author.location": 0
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
  
  // Add comment to a post
  router.post('/:postId/comment', authMiddleware, async (req, res) => {
    try {
      const { postId } = req.params;
      const { content } = req.body;
      
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
  
      // Check if the user has interacted with the post
      const hasInteracted = post.interactions.some(
        interaction => interaction.user.toString() === req.user.id
      );
  
      if (!hasInteracted) {
        return res.status(403).json({ message: 'You must interact with the post before commenting' });
      }
  
      const comment = {
        user: req.user.id,
        content
      };
  
      post.comments.push(comment);
      await post.save();
  
      res.status(201).json(comment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get post with interactions and comments
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
  


module.exports = router;
