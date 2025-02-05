import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Hls from "hls.js";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import {
  FiPlay,
  FiPause,
  FiMaximize,
  FiMinimize,
  FiVolume2,
  FiVolumeX,
  FiSettings,
  FiRotateCcw,
  FiRotateCw,
  FiTrash2,
} from "react-icons/fi";

export default function VideoPlayer({ src, onDelete }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hlsRef = useRef(null);
  const [currentQuality, setCurrentQuality] = useState("auto");
  const [availableQualities, setAvailableQualities] = useState(["auto"]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState([]);
  const controlsTimeoutRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const skipTime = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const togglePlay = async () => {
    if (!videoRef.current) return;
    try {
      if (videoRef.current.paused) {
        await videoRef.current.play();
        setIsPlaying(true);
      } else {
        await videoRef.current.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("Error toggling play/pause:", error);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleQualityChange = (quality) => {
    if (!hlsRef.current) return;

    const levelIndex = quality === "auto" 
      ? -1 
      : hlsRef.current.levels.findIndex(level => `${level.height}p` === quality);

    hlsRef.current.currentLevel = levelIndex;
    setCurrentQuality(quality);
    setShowSettings(false);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = (e) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
    setProgress(pos * 100);
  };

  const initializePlayer = () => {
    if (!videoRef.current || !src) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        capLevelToPlayerSize: true,
        debug: false,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferLength: 60,
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 5,
        levelLoadingTimeOut: 15000,
        fragLoadingTimeOut: 15000,
        startLevel: -1,
      });

      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setAvailableQualities([
          "auto",
          ...data.levels.map((level) => `${level.height}p`),
        ]);
        setLoading(false);
        if (videoRef.current) {
          setDuration(videoRef.current.duration);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("Fatal network error, trying to recover...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("Fatal media error, trying to recover...");
              hls.recoverMediaError();
              break;
            default:
              console.log("Fatal error, cannot recover");
              hls.destroy();
              break;
          }
        }
      });
    }
  };

  useEffect(() => {
    initializePlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setProgress((video.currentTime / video.duration) * 100);
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateBuffered = () => {
      const timeRanges = [];
      for (let i = 0; i < video.buffered.length; i++) {
        timeRanges.push({
          start: video.buffered.start(i),
          end: video.buffered.end(i)
        });
      }
      setBuffered(timeRanges);
    };

    video.addEventListener('progress', updateBuffered);
    return () => video.removeEventListener('progress', updateBuffered);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-lg overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        onClick={togglePlay}
        playsInline
      />

      {/* Loading/Buffering Overlay */}
      {(loading || isBuffering) && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-black/50 z-20"
        >
          <div className="w-16 h-16 border-4 border-white/20 border-t-white
            rounded-full animate-spin" />
        </motion.div>
      )}

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showControls ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
      >
        {/* Center Controls Group */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
          flex items-center justify-center gap-8">
          {/* Back 10s */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => skipTime(-10)}
            className="group p-3 rounded-full bg-black/50 text-white hover:bg-black/70
              backdrop-blur-sm transition-all duration-300"
          >
            <div className="relative flex items-center">
              <FiRotateCcw className="w-6 h-6" />
              <span className="absolute left-1/2 -translate-x-1/2 -bottom-8 
                bg-black/75 text-white text-xs py-1 px-2 rounded opacity-0 
                group-hover:opacity-100 transition-opacity whitespace-nowrap">
                10s
              </span>
            </div>
          </motion.button>

          {/* Play/Pause Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={togglePlay}
            className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center
              hover:bg-black/70 transition-colors backdrop-blur-sm"
          >
            {isPlaying ? (
              <FiPause className="w-10 h-10 text-white" />
            ) : (
              <FiPlay className="w-10 h-10 text-white ml-2" />
            )}
          </motion.button>

          {/* Forward 10s */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => skipTime(10)}
            className="group p-3 rounded-full bg-black/50 text-white hover:bg-black/70
              backdrop-blur-sm transition-all duration-300"
          >
            <div className="relative flex items-center">
              <FiRotateCw className="w-6 h-6" />
              <span className="absolute left-1/2 -translate-x-1/2 -bottom-8 
                bg-black/75 text-white text-xs py-1 px-2 rounded opacity-0 
                group-hover:opacity-100 transition-opacity whitespace-nowrap">
                10s
              </span>
            </div>
          </motion.button>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-16 left-0 right-0 px-4">
          <div
            ref={progressRef}
            className="h-1 bg-white/30 cursor-pointer rounded overflow-hidden relative
              hover:h-2 transition-all duration-200"
            onClick={handleProgressClick}
          >
            {/* Buffered Regions */}
            {buffered.map((range, index) => {
              const start = (range.start / duration) * 100;
              const width = ((range.end - range.start) / duration) * 100;
              return (
                <div
                  key={index}
                  className="absolute h-full bg-white/40"
                  style={{ left: `${start}%`, width: `${width}%` }}
                />
              );
            })}
            {/* Progress Bar */}
            <motion.div
              className="h-full bg-indigo-500"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-white hover:text-indigo-400 transition-colors"
              >
                {isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 accent-indigo-500"
              />
            </div>

            <span className="text-white text-sm">
              {formatTime(videoRef.current?.currentTime || 0)} /
              {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-white hover:text-indigo-400 transition-colors"
              >
                <FiSettings size={20} />
              </button>
              
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg overflow-hidden">
                  <div className="p-2">
                    {availableQualities.map((quality) => (
                      <button
                        key={quality}
                        onClick={() => handleQualityChange(quality)}
                        className={`block w-full px-4 py-2 text-sm text-left hover:bg-white/10
                          ${quality === currentQuality ? 'text-indigo-400' : 'text-white'}`}
                      >
                        {quality}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-indigo-400 transition-colors"
            >
              {isFullscreen ? <FiMinimize size={20} /> : <FiMaximize size={20} />}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

VideoPlayer.propTypes = {
  src: PropTypes.string.isRequired
}; 