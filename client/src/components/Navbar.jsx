import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiVideo, FiUploadCloud, FiHome } from 'react-icons/fi';

export default function Navbar() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/', label: 'Home', icon: FiHome },
    { path: '/videos', label: 'Videos', icon: FiVideo },
    { path: '/upload', label: 'Upload', icon: FiUploadCloud }
  ];

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="bg-white border-b border-gray-100 sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <motion.div 
              className="flex-shrink-0 flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Link to="/" className="flex items-center space-x-2">
                <motion.div
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <FiVideo className="h-8 w-8 text-indigo-600" />
                </motion.div>
                <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 
                  bg-clip-text text-transparent">
                  Video Platform
                </span>
              </Link>
            </motion.div>

            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className="relative group px-3 py-2"
                >
                  <motion.div 
                    className={`flex items-center space-x-2 transition-colors duration-200
                      ${isActive(path) 
                        ? 'text-indigo-600' 
                        : 'text-gray-600 hover:text-indigo-600'}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Icon className="w-5 h-5" />
                    </motion.div>
                    <span className="text-sm font-medium">{label}</span>
                  </motion.div>
                  {isActive(path) && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600
                hover:text-indigo-600 hover:bg-gray-100 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <motion.div 
        className="sm:hidden"
        initial={false}
      >
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <motion.div
              key={path}
              whileHover={{ scale: 1.02, x: 10 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                to={path}
                className={`flex items-center space-x-2 px-3 py-2 text-base font-medium
                  ${isActive(path)
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'}`}
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.3 }}
                >
                  <Icon className="w-5 h-5" />
                </motion.div>
                <span>{label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.nav>
  );
} 