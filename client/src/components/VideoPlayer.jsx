import React, { useEffect, useRef, useState } from "react";
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
} from "react-icons/fi";

export default function VideoPlayer({ src, onError }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
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
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
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

    if (src.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });

      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const qualities = data.levels.map(level => `${level.height}p`);
        setAvailableQualities(['auto', ...qualities]);
        setLoading(false);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              initializePlayer();
              break;
          }
        }
      });
    } else {
      videoRef.current.src = src;
      videoRef.current.onerror = () => {
        setLoading(false);
        if (onError) {
          onError('Error loading video');
        }
      };
      
      videoRef.current.onloadedmetadata = () => {
        setLoading(false);
      };
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
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
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

      {/* Custom Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
          >
            {/* Center Controls */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
              flex items-center justify-center gap-8">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => skipTime(-10)}
                className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70
                  backdrop-blur-sm transition-all duration-300"
              >
                <FiRotateCcw className="w-6 h-6" />
              </motion.button>

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

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => skipTime(10)}
                className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70
                  backdrop-blur-sm transition-all duration-300"
              >
                <FiRotateCw className="w-6 h-6" />
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
                {buffered.map((range, index) => (
                  <div
                    key={index}
                    className="absolute h-full bg-white/40"
                    style={{
                      left: `${(range.start / duration) * 100}%`,
                      width: `${((range.end - range.start) / duration) * 100}%`
                    }}
                  />
                ))}
                <motion.div
                  className="h-full bg-indigo-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 px-4 py-3 
              flex items-center justify-between">
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
                    className="p-2 text-white hover:bg-white/20 rounded transition-colors"
                  >
                    <FiSettings className="w-6 h-6" />
                  </button>
                  
                  {showSettings && (
                    <div className="absolute bottom-12 right-0 bg-black/90 rounded-lg p-2 min-w-[120px]">
                      <div className="text-white text-sm font-medium mb-2 px-4">Quality</div>
                      {availableQualities.map((quality) => (
                        <button
                          key={quality}
                          onClick={() => handleQualityChange(quality)}
                          className={`block w-full text-left px-4 py-2 text-sm rounded text-white
                            ${currentQuality === quality ? 'bg-white/20' : 'hover:bg-white/10'}`}
                        >
                          {quality === 'auto' ? 'Auto' : quality}
                        </button>
                      ))}
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
        )}
      </AnimatePresence>
    </div>
  );
}

VideoPlayer.propTypes = {
  src: PropTypes.string.isRequired,
  onError: PropTypes.func
}; 