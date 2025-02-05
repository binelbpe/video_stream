import { motion } from 'framer-motion';
import VideoUpload from '../components/VideoUpload';
import Toast from '../components/Toast';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUploadCloud } from 'react-icons/fi';

export default function UploadPage() {
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const handleUploadComplete = () => {
    setToast({ message: 'Video uploaded successfully!', type: 'success' });
    setTimeout(() => {
      navigate('/videos');
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gray-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <FiUploadCloud className="w-16 h-16 text-indigo-600" />
            </motion.div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 
            bg-clip-text text-transparent mb-2">
            Upload Video
          </h1>
          <p className="text-gray-600">Share your videos with the world</p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <VideoUpload 
            onUploadComplete={handleUploadComplete}
            onError={(message) => setToast({ message, type: 'error' })}
          />
        </motion.div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </motion.div>
  );
} 