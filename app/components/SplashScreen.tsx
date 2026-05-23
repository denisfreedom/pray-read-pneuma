'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Mark as loaded after a short delay to ensure smooth transition
    const loadTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 500);

    // Hide splash screen after 3 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    return () => {
      clearTimeout(loadTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, #1e3a8a 0%, #312e81 50%, #1e1b4b 100%)',
          }}
        >
          {/* Full Screen Splash Image */}
          <div className="relative w-full h-full flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: isLoaded ? 1 : 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative w-full h-full max-w-[90vw] max-h-[90vh] md:max-w-2xl md:max-h-[80vh]"
            >
              <Image
                src="https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779413353092_28zfv.png"
                alt="Pray-Read Bible App"
                fill
                className="object-contain"
                priority
                quality={100}
              />
            </motion.div>

            {/* Subtle glow effect behind the image */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isLoaded ? 0.3 : 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-96 h-96 bg-amber-400/20 rounded-full blur-[100px]" />
            </motion.div>
          </div>

          {/* Loading indicator (optional) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute bottom-20 left-1/2 transform -translate-x-1/2"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
