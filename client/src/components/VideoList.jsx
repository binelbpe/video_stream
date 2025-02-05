import { useState, useEffect } from 'react';
import axios from 'axios';
import VideoPlayer from './VideoPlayer';
import VideoMetadata from './VideoMetadata';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { FiPlay, FiTrash2, FiClock, FiCalendar, FiFilm } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

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
      const response = await axios.get('http://localhost:3000/api/videos');
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
      await axios.delete(`http://localhost:3000/api/videos/${video._id}`);
      setVideos(videos.filter(v => v._id !== video._id));
      if (selectedVideo?._id === video._id) {
        setSelectedVideo(null);
      }
    } catch (err) {
      onError('Failed to delete video');
      console.error('Error deleting video:', err);
    }
  };

  const getThumbnailUrl = (video) => {
    if (!video.thumbnailPath) return null;
    return `http://localhost:3000/thumbnails/${video.thumbnailPath.split(/[/\\]/).pop()}`;
  };

  const handleVideoClick = (video) => {
    navigate(`/videos/${video._id}`);
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
            src={`http://localhost:3000/api/videos/${selectedVideo._id}/stream/master.m3u8`} 
          />
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold text-gray-900">
                {selectedVideo.title}
              </h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleDelete(selectedVideo)}
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {videos.map((video) => (
            <motion.div 
              key={video._id}
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              className="group bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer
                hover:shadow-2xl transition-all duration-300"
              onClick={() => handleVideoClick(video)}
            >
              <div className="relative aspect-video bg-gray-100">
                {video.thumbnailPath ? (
                  <img 
                    src={getThumbnailUrl(video)}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FiFilm className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
                  flex items-center justify-center transition-opacity duration-300">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center"
                  >
                    <FiPlay className="w-8 h-8 text-white" />
                  </motion.div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-indigo-600
                  transition-colors duration-300">
                  {video.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <FiClock className="w-4 h-4" />
                    <span>{video.metadata?.duration || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FiCalendar className="w-4 h-4" />
                    <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                  </div>
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