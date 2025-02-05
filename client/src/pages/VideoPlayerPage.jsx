import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import VideoPlayer from '../components/VideoPlayer';
import VideoMetadata from '../components/VideoMetadata';
import Toast from '../components/Toast';
import { FiArrowLeft } from 'react-icons/fi';
import { config } from '../config/config.js';

export default function VideoPlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchVideo();
  }, [id]);

  const fetchVideo = async () => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/videos/${id}`);
      console.log('Fetched video data:', response.data);
      setVideo(response.data);
    } catch (error) {
      console.error('Error fetching video:', error);
      setToast({ message: 'Failed to load video', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleError = (message) => {
    setToast({ message, type: 'error' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-600 
          rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gray-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.button
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/videos')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-indigo-600 
            transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
          <span>Back to Videos</span>
        </motion.button>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {video && (
            <>
              <VideoPlayer 
                src={video.hlsUrl || video.s3Url}
                onError={handleError}
              />
              <div className="p-6">
                <h1 className="text-2xl font-semibold text-gray-900 mb-4">
                  {video.title}
                </h1>
                <VideoMetadata video={video} />
              </div>
            </>
          )}
        </motion.div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </motion.div>
  );
} 