import { useState, useCallback } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FiUploadCloud, FiX, FiCheck, FiFile } from 'react-icons/fi';
import PropTypes from 'prop-types';
import { config } from '../config/config.js';

export default function VideoUpload({ onUploadComplete, onError }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const validateFile = (file) => {
    const validTypes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska'
    ];
    
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload MP4, MOV, AVI, or MKV files.');
    }

    if (file.size > 500 * 1024 * 1024) { // 500MB
      throw new Error('File too large. Maximum size is 500MB.');
    }

    return true;
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    try {
      if (droppedFile && validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    } catch (error) {
      onError(error.message);
    }
  }, [onError]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    try {
      if (selectedFile && validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    } catch (error) {
      onError(error.message);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', file);
      
      const response = await axios.post(`${config.apiUrl}/api/videos/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      if (response.status === 201) {
        setFile(null);
        setUploadProgress(0);
        if (onUploadComplete) {
          onUploadComplete();
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      onError(error.response?.data?.error || 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-xl"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 
          bg-clip-text text-transparent mb-2">
          Upload Your Video
        </h2>
        <p className="text-gray-600">Drag and drop your video file or click to browse</p>
      </motion.div>

      <motion.div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`relative border-3 border-dashed rounded-2xl p-12 transition-all duration-300
          ${dragActive 
            ? 'border-violet-500 bg-violet-50' 
            : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'}`}
      >
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
          id="video-upload"
        />
        <label 
          htmlFor="video-upload" 
          className="block cursor-pointer text-center"
        >
          <motion.div
            animate={{ scale: dragActive ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
          >
            <FiUploadCloud className="mx-auto h-16 w-16 text-violet-500 mb-4" />
            <p className="text-gray-600 mb-2">
              {dragActive ? 'Drop your video here' : 'Click to select or drag a video file'}
            </p>
            <p className="text-sm text-gray-500">
              Supported formats: MP4, MOV, AVI
            </p>
          </motion.div>
        </label>
      </motion.div>

      {file && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6 bg-gray-50 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FiFile className="w-6 h-6 text-violet-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleUpload}
        disabled={!file || uploading}
        className={`w-full mt-6 py-3 px-6 rounded-xl font-medium text-white
          transition-all duration-300 shadow-lg disabled:cursor-not-allowed
          ${!file || uploading 
            ? 'bg-gray-400' 
            : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700'
          }`}
      >
        {uploading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Uploading...</span>
          </div>
        ) : (
          <span>Upload Video</span>
        )}
      </motion.button>

      {uploading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6"
        >
          <div className="relative pt-1">
            <div className="h-2 bg-gray-200 rounded-full">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-semibold text-violet-600">
                {uploadProgress}% Complete
              </span>
              {uploadProgress === 100 && (
                <span className="text-xs font-semibold text-green-500 flex items-center">
                  <FiCheck className="w-4 h-4 mr-1" />
                  Upload Complete
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

VideoUpload.propTypes = {
  onUploadComplete: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired
}; 