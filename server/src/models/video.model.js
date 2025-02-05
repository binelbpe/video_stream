import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  filename: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  thumbnailPath: {
    type: String,
  },
  duration: {
    type: Number,
  },
  qualities: [{
    resolution: { type: String, required: true },
    path: { type: String, required: true },
    bitrate: { type: String, required: true },
    size: { type: String, required: true },
    bandwidth: { type: Number, required: true }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    duration: Number,
    size: Number,
    width: Number,
    height: Number,
    codec: String,
    bitrate: Number,
    fps: Number,
    audioCodec: String,
  },
});

export const Video = mongoose.model('Video', videoSchema); 