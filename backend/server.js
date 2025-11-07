const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet'); 
const mongoSanitize = require('express-mongo-sanitize'); 

dotenv.config();

// Connect to database
connectDB();

const app = express();

// --- START CORS CONFIGURATION FIX ---
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL // Will be set to your Vercel URL in production
];

// Middleware 
app.use(helmet()); 
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow the origin if it's in the allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Allow if the origin is the Vercel/Render URL itself (for internal checks)
      if (origin.includes('render.com') || origin.includes('vercel.app')) {
         callback(null, true);
      } else {
         callback(new Error('Not allowed by CORS'), false);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// --- END CORS CONFIGURATION FIX ---

app.use(express.json({ limit: '10kb' })); 
app.use(cookieParser());
app.use(mongoSanitize()); 


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', limiter); 

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/posts', require('./routes/post.routes'));

// Error Handling
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);
  
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});