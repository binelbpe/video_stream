import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { FiClock, FiHardDrive, FiMonitor, FiVideo, FiMusic } from 'react-icons/fi';

export default function VideoMetadata({ video }) {
  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s]
      .map(v => v.toString().padStart(2, '0'))
      .filter((v, i) => v !== '00' || i > 0)
      .join(':');
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  };

  // Add null check for metadata
  const metadata = video?.metadata || {};

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-50 rounded-xl p-6 mt-4"
    >
      <h4 className="text-lg font-semibold text-gray-900 mb-4">Video Details</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-white p-4 rounded-lg shadow-sm"
        >
          <div className="flex items-center gap-2 text-violet-600 mb-2">
            <FiClock className="w-5 h-5" />
            <p className="font-medium">Duration</p>
          </div>
          <p className="text-gray-900">{formatDuration(metadata.duration)}</p>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-white p-4 rounded-lg shadow-sm"
        >
          <div className="flex items-center gap-2 text-violet-600 mb-2">
            <FiHardDrive className="w-5 h-5" />
            <p className="font-medium">Size</p>
          </div>
          <p className="text-gray-900">{formatSize(metadata.size)}</p>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-white p-4 rounded-lg shadow-sm"
        >
          <div className="flex items-center gap-2 text-violet-600 mb-2">
            <FiMonitor className="w-5 h-5" />
            <p className="font-medium">Resolution</p>
          </div>
          <p className="text-gray-900">
            {metadata.width && metadata.height 
              ? `${metadata.width}x${metadata.height}`
              : 'Unknown'}
          </p>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-white p-4 rounded-lg shadow-sm"
        >
          <div className="flex items-center gap-2 text-violet-600 mb-2">
            <FiVideo className="w-5 h-5" />
            <p className="font-medium">Video Codec</p>
          </div>
          <p className="text-gray-900">
            {metadata.codec ? metadata.codec.toUpperCase() : 'Unknown'}
          </p>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-white p-4 rounded-lg shadow-sm"
        >
          <div className="flex items-center gap-2 text-violet-600 mb-2">
            <FiMusic className="w-5 h-5" />
            <p className="font-medium">Audio Codec</p>
          </div>
          <p className="text-gray-900">
            {metadata.audioCodec ? metadata.audioCodec.toUpperCase() : 'Unknown'}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

VideoMetadata.propTypes = {
  video: PropTypes.shape({
    metadata: PropTypes.shape({
      duration: PropTypes.number,
      size: PropTypes.number,
      width: PropTypes.number,
      height: PropTypes.number,
      codec: PropTypes.string,
      audioCodec: PropTypes.string,
      fps: PropTypes.number
    })
  })
}; 