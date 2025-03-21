const Post = require('../models/Post');

exports.createPost = async (req, res) => {
  try {
    const { content, location, radius } = req.body;
    
    if (!content || !location || !radius) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const post = new Post({
      user: req.user.id,
      content,
      location,
      radius
    });

    await post.save();
    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getNearbyPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const posts = await Post.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: user.location.coordinates
          },
          $maxDistance: 10000 // 10km radius
        }
      }
    }).populate('user', 'name');

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
