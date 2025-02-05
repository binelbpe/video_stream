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
  s3Key: {
    type: String,
    required: true,
  },
  s3Url: {
    type: String,
    required: true,
  },
  thumbnailKey: {
    type: String,
  },
  thumbnailUrl: {
    type: String,
  },
  hlsKey: {
    type: String,
  },
  hlsUrl: {
    type: String,
  },
  qualities: [{
    resolution: String,
    bandwidth: Number,
    size: String
  }],
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Video = mongoose.model('Video', videoSchema); 