import { motion } from 'framer-motion';
import VideoList from '../components/VideoList';
import Toast from '../components/Toast';
import { useState } from 'react';

export default function VideosPage() {
  const [toast, setToast] = useState(null);

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
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 
            bg-clip-text text-transparent mb-2">
            Videos
          </h1>
          <p className="text-gray-600">Browse and manage your video collection</p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <VideoList onError={(message) => setToast({ message, type: 'error' })} />
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