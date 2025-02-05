import { Video } from '../models/video.model.js';
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { rimraf } from 'rimraf';
import mongoose from 'mongoose';

const UPLOAD_DIR = 'uploads';
const HLS_DIR = 'hls';
const THUMBNAIL_DIR = 'thumbnails';

export const uploadVideo = async (req, res) => {
  let uploadedFile = null;
  let createdDirs = [];

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    uploadedFile = req.file;
    const { filename, path: filePath } = uploadedFile;
    console.log('Uploaded file:', { filename, path: filePath });

    const outputDir = path.join(HLS_DIR, path.parse(filename).name);
    console.log('Output directory:', outputDir);

    // Create directories
    for (const dir of [outputDir, THUMBNAIL_DIR]) {
      await fs.mkdir(dir, { recursive: true });
      createdDirs.push(dir);
      console.log(`Created directory: ${dir}`);
    }

    // Verify file exists
    await fs.access(filePath);
    console.log('File exists and is accessible');

    // Create video document
    const video = new Video({
      title: path.parse(filename).name,
      filename,
      path: filePath,
      qualities: [],
    });

    // Generate thumbnail with better error handling
    try {
      const thumbnailPath = await generateThumbnail(filePath, filename);
      video.thumbnailPath = thumbnailPath;
      console.log('Thumbnail generated:', thumbnailPath);
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      // Continue without thumbnail
    }

    // Generate HLS streams
    console.log('Generating HLS streams...');
    await generateHLSStreams(filePath, outputDir, video);
    console.log('HLS streams generated');

    // Generate master playlist
    console.log('Generating master playlist...');
    await generateMasterPlaylist(outputDir, video.qualities);
    console.log('Master playlist generated');

    // Extract metadata
    try {
      video.metadata = await extractMetadata(filePath);
    } catch (error) {
      console.error('Metadata extraction failed:', error);
      video.metadata = {};
    }

    await video.save();
    console.log('Video document saved to database');

    res.status(201).json(video);

  } catch (error) {
    console.error('Upload error:', error);

    // Cleanup on error
    try {
      if (uploadedFile) {
        await fs.unlink(uploadedFile.path).catch(console.error);
      }
      
      for (const dir of createdDirs) {
        await rimraf(dir).catch(console.error);
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    res.status(500).json({ 
      error: 'Error processing video',
      details: error.message 
    });
  }
};

const generateThumbnail = async (inputPath, filename) => {
  const thumbnailFilename = `${path.parse(filename).name}.jpg`;
  const thumbnailPath = path.join(THUMBNAIL_DIR, thumbnailFilename);
  
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: thumbnailFilename,
        folder: THUMBNAIL_DIR,
        size: '320x240'
      })
      .on('end', () => {
        console.log('Thumbnail generated successfully');
        resolve();
      })
      .on('error', (err) => {
        console.error('Thumbnail generation error:', err);
        reject(err);
      });
  });

  return thumbnailPath;
};

const generateHLSStreams = async (inputPath, outputDir, video) => {
  const qualities = [
    { resolution: '240p', size: '426x240', bitrate: '400k', bandwidth: 400000 },
    { resolution: '480p', size: '854x480', bitrate: '800k', bandwidth: 800000 },
    { resolution: '720p', size: '1280x720', bitrate: '2500k', bandwidth: 2500000 },
    { resolution: '1080p', size: '1920x1080', bitrate: '5000k', bandwidth: 5000000 },
  ];

  video.qualities = []; // Reset qualities array

  for (const quality of qualities) {
    const outputPath = path.join(outputDir, `${quality.resolution}.m3u8`);
    
    try {
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .addOption('-profile:v', 'baseline')
          .addOption('-level', '3.0')
          .addOption('-start_number', '0')
          .addOption('-hls_time', '10')
          .addOption('-hls_list_size', '0')
          .addOption('-f', 'hls')
          .addOption('-c:v', 'libx264')
          .addOption('-c:a', 'aac')
          .addOption('-b:v', quality.bitrate)
          .addOption('-maxrate', quality.bitrate)
          .addOption('-bufsize', `${parseInt(quality.bitrate)}*2`)
          .addOption('-s', quality.size)
          .addOption('-preset', 'fast')
          .addOption('-g', '48')
          .addOption('-sc_threshold', '0')
          .output(outputPath)
          .on('start', (commandLine) => {
            console.log('Spawned FFmpeg with command:', commandLine);
          })
          .on('progress', (progress) => {
            console.log(`Processing ${quality.resolution}: ${progress.percent}% done`);
          })
          .on('end', () => {
            console.log(`Finished processing ${quality.resolution}`);
            video.qualities.push({
              resolution: quality.resolution,
              path: outputPath,
              bitrate: quality.bitrate,
              size: quality.size,
              bandwidth: quality.bandwidth
            });
            resolve();
          })
          .on('error', (err) => {
            console.error(`Error processing ${quality.resolution}:`, err);
            reject(err);
          })
          .run();
      });
    } catch (error) {
      console.error(`Error generating HLS stream for ${quality.resolution}:`, error);
    }
  }

  if (video.qualities.length === 0) {
    throw new Error('Failed to generate any quality streams');
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

export const getVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.json(videos);
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
    res.json(video);
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

    // Delete files
    const filesToDelete = [
      video.path,
      video.thumbnailPath,
      path.join(HLS_DIR, path.parse(video.filename).name)
    ];

    for (const file of filesToDelete) {
      try {
        await rimraf(file);
      } catch (error) {
        console.error(`Error deleting ${file}:`, error);
      }
    }

    await Video.findByIdAndDelete(req.params.id);
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Error deleting video' });
  }
};