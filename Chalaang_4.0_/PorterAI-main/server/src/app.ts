import dotenv from 'dotenv';

dotenv.config();
import express from 'express';
import cors from 'cors';
import aiRoutes from './routes/aiRoutes';
import orderRoutes from './routes/orderRoutes';
import { connectDB } from './config/database';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', aiRoutes);
app.use("/orders", orderRoutes);

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));