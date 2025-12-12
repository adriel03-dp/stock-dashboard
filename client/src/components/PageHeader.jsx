import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function PageHeader({ 
  title, 
  description, 
  icon: Icon, 
  actions = null,
  breadcrumb = null,
  backgroundImage = null,
  backgroundImages = null,
  cycleInterval = 3000
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = backgroundImages && backgroundImages.length > 0 ? backgroundImages : (backgroundImage ? [backgroundImage] : []);
  const displayImage = images.length > 0 ? images[currentImageIndex] : null;

  useEffect(() => {
    if (!images || images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, cycleInterval);
    
    return () => clearInterval(interval);
  }, [images, cycleInterval]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative mb-8 rounded-xl border border-slate-200/80 overflow-hidden px-6 py-8 dark:border-slate-700/80 shadow-sm dark:shadow-none"
    >
      {/* Smooth background image transition with Ken Burns effect */}
      <motion.div
        key={currentImageIndex}
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1.02 }}
        exit={{ opacity: 0, scale: 1.08 }}
        transition={{ 
          duration: 2, 
          ease: "easeInOut",
          scale: {
            duration: 5,
            ease: "easeInOut"
          }
        }}
        className="absolute inset-0"
        style={{
          backgroundImage: displayImage ? `url(${displayImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      />
      
      {/* Background overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/50 to-white/30 dark:from-slate-900/85 dark:via-slate-900/80 dark:to-slate-900/70 pointer-events-none" />
      
      {breadcrumb && (
        <motion.div variants={itemVariants} className="mb-4 relative z-10">
          {breadcrumb}
        </motion.div>
      )}
      
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {Icon && (
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-violet-600 p-3 shadow-lg"
            >
              <Icon className="h-6 w-6 text-white" />
            </motion.div>
          )}
          
          <motion.div variants={itemVariants} className="flex-1">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            {description && (
              <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
                {description}
              </p>
            )}
          </motion.div>
        </div>

        {actions && (
          <motion.div variants={itemVariants} className="flex gap-2">
            {actions}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
