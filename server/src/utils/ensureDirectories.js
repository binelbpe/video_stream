import { promises as fs } from 'fs';
import path from 'path';

const REQUIRED_DIRS = ['uploads', 'hls', 'thumbnails'];

export async function ensureDirectories() {
  try {
    for (const dir of REQUIRED_DIRS) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`Directory '${dir}' is ready`);
    }
  } catch (error) {
    console.error('Error creating directories:', error);
    throw error;
  }
} 