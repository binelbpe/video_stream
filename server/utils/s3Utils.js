import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME } from '../config/s3Config.js';
import path from 'path';
import { promises as fs } from 'fs';

export const uploadToS3 = async (file, folder) => {
  try {
    const fileContent = await fs.readFile(file.path);
    const key = `${folder}/${Date.now()}-${path.basename(file.originalname)}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: file.mimetype,
      ContentDisposition: 'inline',
      Metadata: {
        'original-filename': file.originalname
      }
    });

    await s3Client.send(command);
    
    return {
      key,
      url: `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
};

export const deleteFromS3 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw error;
  }
};

export const uploadHLSToS3 = async (hlsDir, dirName) => {
  try {
    console.log('Starting HLS upload to S3...');
    console.log('HLS Directory:', hlsDir);
    console.log('Directory Name:', dirName);

    const files = await fs.readdir(hlsDir);
    console.log('Files to upload:', files);

    const uploads = files.map(async (file) => {
      const filePath = path.join(hlsDir, file);
      const fileContent = await fs.readFile(filePath);
      const key = `hls/${dirName}/${file}`;
      
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: fileContent,
        ContentType: file.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/MP2T',
        CacheControl: 'max-age=31536000'
      });

      await s3Client.send(command);
      console.log(`Uploaded ${file} to ${key}`);
      return key;
    });

    await Promise.all(uploads);
    console.log('All HLS files uploaded successfully');
    
    return {
      key: `hls/${dirName}`,
      url: `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/hls/${dirName}/master.m3u8`
    };
  } catch (error) {
    console.error('Error uploading HLS to S3:', error);
    throw error;
  }
}; 