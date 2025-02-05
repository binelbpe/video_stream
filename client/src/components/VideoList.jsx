import { useState, useEffect } from 'react';
import axios from 'axios';
import VideoPlayer from './VideoPlayer';
import VideoMetadata from './VideoMetadata';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { FiPlay, FiTrash2, FiFilm } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/config.js';

export default function VideoList({ onError }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/videos`);
      setVideos(response.data);
    } catch (err) {
      setError('Failed to fetch videos');
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (video) => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      await axios.delete(`${config.apiUrl}/api/videos/${video._id}`);
      setVideos(videos.filter(v => v._id !== video._id));
      if (selectedVideo?._id === video._id) {
        setSelectedVideo(null);
      }
    } catch (err) {
      onError('Failed to delete video');
      console.error('Error deleting video:', err);
    }
  };

  const handleVideoClick = (video) => {
    if (video.s3Url) {
      navigate(`/videos/${video._id}`);
    } else {
      onError('Video URL not available');
    }
  };

  // Container animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Item animation variants
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-600
            rounded-full animate-spin" />
          <div className="mt-4 text-gray-600 font-medium">Loading videos...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FiFilm className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <div className="text-red-600 font-medium">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 
          bg-clip-text text-transparent mb-8 tracking-tight"
      >
        Video Library
      </motion.h2>
      
      {selectedVideo && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <VideoPlayer 
            src={`${config.apiUrl}/api/videos/${selectedVideo._id}/stream/master.m3u8`} 
          />
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold text-gray-900">
                {selectedVideo.title}
              </h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(selectedVideo);
                }}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-white
                  hover:bg-red-600 border-2 border-red-600 rounded-lg transition-all duration-300"
              >
                <FiTrash2 className="w-4 h-4" />
                <span>Delete</span>
              </motion.button>
            </div>
            <VideoMetadata video={selectedVideo} />
          </div>
        </motion.div>
      )}

      {videos.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <FiFilm className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-xl text-gray-600">No videos available</p>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6"
        >
          {videos.map((video) => (
            <motion.div
              key={video._id}
              variants={itemVariants}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl 
                transition-shadow duration-300"
            >
              <div className="relative aspect-video group cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVideoClick(video);
                }}>
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Thumbnail load error:', e);
                      e.target.src = 'fallback-image-url.jpg'; // Add a fallback image
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No thumbnail</span>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 
                  transition-all duration-300 flex items-center justify-center">
                  <FiPlay className="text-white opacity-0 group-hover:opacity-100 transform 
                    scale-50 group-hover:scale-100 transition-all duration-300" 
                    size={48} />
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{video.title}</h3>
                {video.qualities && (
                  <div className="flex gap-2 mb-2">
                    {video.qualities.map((quality) => (
                      <span key={quality.resolution} 
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {quality.resolution}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {new Date(video.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(video);
                    }}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

VideoList.propTypes = {
  onError: PropTypes.func.isRequired
}; 