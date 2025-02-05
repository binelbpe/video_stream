import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadVideo, getVideos, getVideo, deleteVideo } from '../controllers/video.controller.js';
import { promises as fs } from 'fs';

// Ensure temp directory exists
await fs.mkdir('temp', { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'temp/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  // List of valid MIME types
  const validMimeTypes = [
    'video/mp4',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/x-matroska', // .mkv
  ];

  if (validMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Supported types: ${validMimeTypes.join(', ')}`));
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

const handleUpload = (req, res, next) => {
  upload.single('video')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'File too large. Maximum size is 500MB' 
        });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

videoRouter.post('/upload', handleUpload, uploadVideo);
videoRouter.get('/', getVideos);
videoRouter.get('/:id', getVideo);
videoRouter.delete('/:id', deleteVideo); 