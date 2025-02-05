import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { videoRouter } from './routes/video.routes.js';
import { ensureDirectories } from './utils/ensureDirectories.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use('/thumbnails', express.static('thumbnails'));
app.use('/uploads', express.static('uploads'));
app.use('/hls', express.static('hls'));

// Routes
app.use('/api/videos', videoRouter);

// Create required directories and start server
async function startServer() {
  try {
    // Ensure all required directories exist
    await ensureDirectories();

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/video-streaming');
    console.log('Connected to MongoDB');

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 