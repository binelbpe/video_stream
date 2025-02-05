import { Video } from '../models/video.model.js';
import { uploadToS3, deleteFromS3, uploadHLSToS3 } from '../../utils/s3Utils.js';
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { rimraf } from 'rimraf';
import mongoose from 'mongoose';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME } from '../../config/s3Config.js';

const UPLOAD_DIR = 'uploads';
const HLS_DIR = 'hls';
const THUMBNAIL_DIR = 'thumbnails';
const TEMP_DIR = 'temp';

const generateThumbnail = async (videoPath) => {
  const thumbnailFilename = `${Date.now()}-thumbnail.jpg`;
  const thumbnailPath = path.join(TEMP_DIR, thumbnailFilename);
  
  await fs.mkdir(TEMP_DIR, { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: thumbnailFilename,
        folder: TEMP_DIR,
        size: '320x240'
      })
      .on('end', () => resolve(thumbnailPath))
      .on('error', (err) => reject(err));
  });
};

const generateHLSStreams = async (inputPath, outputDir, video) => {
  const qualities = [
    { resolution: '240p', size: '426x240', bitrate: '400k', bandwidth: 400000 },
    { resolution: '480p', size: '854x480', bitrate: '800k', bandwidth: 800000 },
    { resolution: '720p', size: '1280x720', bitrate: '2500k', bandwidth: 2500000 },
    { resolution: '1080p', size: '1920x1080', bitrate: '5000k', bandwidth: 5000000 },
  ];

  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });

  // Generate streams for each quality
  const qualityPromises = qualities.map(quality => {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .size(quality.size)
        .videoBitrate(quality.bitrate)
        .outputOptions([
          '-c:v h264',
          '-c:a aac',
          '-ar 48000',
          '-b:a 128k',
          '-hls_time 10',
          '-hls_list_size 0',
          '-f hls'
        ])
        .output(path.join(outputDir, `${quality.resolution}.m3u8`))
        .on('end', () => {
          resolve({
            resolution: quality.resolution,
            bandwidth: quality.bandwidth,
            size: quality.size
          });
        })
        .on('error', reject)
        .run();
    });
  });

  try {
    const processedQualities = await Promise.all(qualityPromises);
    await generateMasterPlaylist(outputDir, processedQualities);
    return processedQualities;
  } catch (error) {
    console.error('Error generating HLS streams:', error);
    throw error;
  }
};

const generateMasterPlaylist = async (outputDir, qualities) => {
  if (!qualities || qualities.length === 0) {
    throw new Error('No qualities available for master playlist');
  }

  const masterPath = path.join(outputDir, 'master.m3u8');
  let content = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

  for (const quality of qualities) {
    try {
      // Ensure all required properties exist
      if (!quality.resolution || !quality.bandwidth || !quality.size) {
        console.warn('Missing required quality properties:', quality);
        continue;
      }

      content += `#EXT-X-STREAM-INF:BANDWIDTH=${quality.bandwidth},RESOLUTION=${quality.size}\n`;
      content += `${quality.resolution}.m3u8\n`;
    } catch (error) {
      console.error('Failed to process quality:', quality, error);
      continue;
    }
  }

  if (content === '#EXTM3U\n#EXT-X-VERSION:3\n\n') {
    throw new Error('No valid qualities for master playlist');
  }

  await fs.writeFile(masterPath, content, 'utf8');
  return masterPath;
};

const extractMetadata = async (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

      resolve({
        duration: metadata.format.duration,
        size: metadata.format.size,
        width: videoStream?.width,
        height: videoStream?.height,
        codec: videoStream?.codec_name,
        bitrate: metadata.format.bit_rate,
        fps: eval(videoStream?.r_frame_rate),
        audioCodec: audioStream?.codec_name,
      });
    });
  });
};

export const uploadVideo = async (req, res) => {
  let uploadedFile = null;
  let thumbnailPath = null;
  let hlsDir = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    console.log('Starting video upload process...');
    uploadedFile = {
      ...req.file,
      originalname: req.file.originalname || path.basename(req.file.filename)
    };

    // Create HLS directory
    const hlsDirName = `${Date.now()}-${path.parse(uploadedFile.originalname).name}`;
    hlsDir = path.join('temp', 'hls', hlsDirName);
    await fs.mkdir(hlsDir, { recursive: true });
    console.log('Created HLS directory:', hlsDir);

    // Generate HLS streams
    console.log('Generating HLS streams...');
    const qualities = await generateHLSStreams(uploadedFile.path, hlsDir);
    console.log('HLS streams generated:', qualities);

    // Generate thumbnail
    console.log('Generating thumbnail...');
    thumbnailPath = await generateThumbnail(uploadedFile.path);

    // Upload to S3 with better error handling
    console.log('Uploading files to S3...');
    let videoData, thumbnailData, hlsData;
    
    try {
      [videoData, thumbnailData, hlsData] = await Promise.all([
        uploadToS3({
          path: uploadedFile.path,
          originalname: uploadedFile.originalname,
          mimetype: uploadedFile.mimetype
        }, 'videos'),
        uploadToS3({ 
          path: thumbnailPath,
          originalname: `${Date.now()}-thumbnail.jpg`,
          mimetype: 'image/jpeg'
        }, 'thumbnails'),
        uploadHLSToS3(hlsDir, hlsDirName)
      ]);
      console.log('Files uploaded successfully:', { videoData, thumbnailData, hlsData });
    } catch (uploadError) {
      console.error('Error during S3 upload:', uploadError);
      throw new Error('Failed to upload files to S3');
    }

    // Create video document
    const metadata = await extractMetadata(uploadedFile.path);
    const video = new Video({
      title: path.parse(uploadedFile.originalname).name,
      s3Key: videoData.key,
      s3Url: videoData.url,
      thumbnailKey: thumbnailData.key,
      thumbnailUrl: thumbnailData.url,
      hlsKey: hlsData.key,
      hlsUrl: hlsData.url,
      qualities,
      metadata,
    });

    await video.save();

    // Cleanup
    await Promise.all([
      fs.rm(uploadedFile.path, { force: true }),
      fs.rm(thumbnailPath, { force: true }),
      fs.rm(hlsDir, { recursive: true, force: true })
    ]);

    res.status(201).json(video);
  } catch (error) {
    console.error('Upload error:', error);
    // Cleanup on error
    try {
      await Promise.all([
        uploadedFile?.path && fs.rm(uploadedFile.path, { force: true }),
        thumbnailPath && fs.rm(thumbnailPath, { force: true }),
        hlsDir && fs.rm(hlsDir, { recursive: true, force: true })
      ]);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
    res.status(500).json({ error: 'Error processing video' });
  }
};

export const getVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    
    // Use stored S3 URLs
    const videosWithUrls = videos.map(video => ({
      ...video.toObject(),
      videoUrl: video.s3Url,
      thumbnailUrl: video.thumbnailUrl
    }));

    res.json(videosWithUrls);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Error fetching videos' });
  }
};

export const getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Use stored S3 URLs directly
    res.json({
      ...video.toObject(),
      videoUrl: video.s3Url,
      thumbnailUrl: video.thumbnailUrl
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Error fetching video' });
  }
};

export const streamVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const { filename } = video;
    const videoDir = path.join(HLS_DIR, path.parse(filename).name);
    const requestedFile = req.params.filename;

    // Validate the requested file
    if (!requestedFile.match(/^(master\.m3u8|[\w-]+\.(m3u8|ts))$/)) {
      return res.status(400).json({ error: 'Invalid file request' });
    }

    const filePath = path.join(videoDir, requestedFile);

    // Set appropriate headers
    if (requestedFile.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (requestedFile.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/MP2T');
    }

    res.sendFile(filePath, { root: process.cwd() });
  } catch (error) {
    console.error('Streaming error:', error);
    res.status(500).json({ error: 'Error streaming video' });
  }
};

export const getThumbnail = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video || !video.thumbnailPath) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    const thumbnailPath = path.resolve(process.cwd(), video.thumbnailPath);
    res.sendFile(thumbnailPath);
  } catch (error) {
    console.error('Error serving thumbnail:', error);
    res.status(500).json({ error: 'Error fetching thumbnail' });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Delete files from S3
    await Promise.all([
      deleteFromS3(video.s3Key),
      video.thumbnailKey && deleteFromS3(video.thumbnailKey),
    ]);

    await Video.findByIdAndDelete(req.params.id);
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Error deleting video' });
  }
};