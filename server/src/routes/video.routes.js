import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadVideo, getVideos, getVideo, streamVideo, getThumbnail, deleteVideo } from '../controllers/video.controller.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Add file extension validation
    const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      cb(new Error('Invalid file type'));
      return;
    }
    
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  // Additional validation if needed
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
});

export const videoRouter = express.Router();

// Add error handling middleware for multer
const handleUpload = (req, res, next) => {
  upload.single('video')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 500MB' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    next();
  });
};

videoRouter.post('/upload', handleUpload, uploadVideo);
videoRouter.get('/', getVideos);
videoRouter.get('/:id', getVideo);
videoRouter.get('/:id/thumbnail', getThumbnail);
videoRouter.get('/:id/stream/:filename', streamVideo);
videoRouter.delete('/:id', deleteVideo); 