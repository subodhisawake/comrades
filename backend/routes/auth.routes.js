const express = require('express');
const { body, validationResult } = require('express-validator');
const { register, login } = require('../controllers/auth.controller');
const router = express.Router();


router.post(
  '/register',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('location')
      .exists()
      .withMessage('Location is required'),
    body('location.type')
      .equals('Point')
      .withMessage('Invalid location type'),
    body('location.coordinates')
      .isArray({ min: 2, max: 2 })
      .withMessage('Invalid coordinates format')
  ],
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  register
);

router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  login 
);

module.exports = router;
