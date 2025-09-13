import dotenv from 'dotenv';

dotenv.config();
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import aiRoutes from './routes/aiRoutes';
import orderRoutes from './routes/orderRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import { connectDB } from './config/database';

const app = express();

// Configure CORS for possible frontend ports
app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'], // Allow all possible ports
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// All routes under /api
app.use('/api', aiRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  // Handle Groq API errors
  if (err.name === 'GroqError') {
    return res.status(500).json({
      error: 'AI Service Error',
      message: 'The AI service is temporarily unavailable. Please try again.'
    });
  }

  // Handle MongoDB errors
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    return res.status(500).json({
      error: 'Database Error',
      message: 'A database error occurred. Please try again.'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    message: 'Something went wrong. Please try again later.'
  });
});

// Connect to MongoDB (but don't fail if it's not available)
connectDB().catch(err => {
  console.warn('MongoDB connection failed, continuing without database:', err.message);
});

const PORT = process.env.PORT || 5001; // Match the frontend proxy port
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend should be accessible at: http://localhost:5175`);
});