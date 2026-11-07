"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const pathname = usePathname();

  // Don't show splash screen on bible reader pages
  const isBibleReader = pathname?.startsWith('/bible-reader');

  useEffect(() => {
    if (isBibleReader) {
      setIsVisible(false);
      return;
    }
    const loadTimer = setTimeout(() => setIsLoaded(true), 300);
    const hideTimer = setTimeout(() => setIsVisible(false), 2800);
    return () => {
      clearTimeout(loadTimer);
      clearTimeout(hideTimer);
    };
  }, [isBibleReader]);

  if (isBibleReader) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => setIsVisible(false)}
          role="button"
          aria-label="Tap to continue to Pray-Read Bible"
          className="fixed inset-0 z-[9999] overflow-hidden cursor-pointer select-none"
          style={{
            background: 'linear-gradient(180deg, #1e3a8a 0%, #312e81 50%, #1e1b4b 100%)',
          }}
        >
          {/* Glow — scales with screen, never overflows */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoaded ? 0.35 : 0 }}
            transition={{ duration: 1 }}
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/25 blur-[80px] sm:blur-[100px] w-[70vmin] h-[70vmin]"
          />

          {/* Content — flex column, safe-area aware, no fixed heights */}
          <div
            className="relative flex h-full w-full flex-col items-center justify-center gap-4 px-4 sm:px-6 md:px-8"
            style={{
              paddingTop: 'max(1rem, env(safe-area-inset-top))',
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            }}
          >
            {/* Artwork — the responsive heart of the splash.
                Mobile (portrait):  fills width, capped at 62% of viewport height
                Tablet:              capped at 72vw / 68vh
                Desktop:             capped at 46rem wide / 72vh tall
                Landscape phones:    height cap wins, so it never crops top/bottom */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: isLoaded ? 1 : 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="relative w-full shrink-0"
              style={{
                maxWidth: 'min(92vw, 46rem)',
                height: 'min(62dvh, 36rem)',
              }}
            >
              {!imgFailed ? (
                <Image
                  src="https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779413353092_28zfv.png"
                  alt="Pray-Read Bible App"
                  fill
                  priority
                  quality={90}
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 72vw, 46rem"
                  onError={() => setImgFailed(true)}
                  className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
                />
              ) : (
                /* Text fallback if the CDN image ever fails — app still looks intentional */
                <div className="flex h-full w-full flex-col items-center justify-center text-center">
                  <span className="text-6xl sm:text-7xl md:text-8xl" aria-hidden>📖</span>
                  <span className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
                    PRAY-READ
                  </span>
                  <span className="mt-1 text-sm sm:text-base md:text-lg tracking-[0.35em] text-amber-300">
                    BIBLE
                  </span>
                </div>
              )}
            </motion.div>

            {/* Wordmark — fluid type, always readable, never wraps badly */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 8 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="shrink-0 text-center"
            >
              <p className="font-bold tracking-tight text-white text-[clamp(1.5rem,6vw,2.75rem)] leading-none">
                PRAY-READ <span className="text-amber-300">BIBLE</span>
              </p>
              <p className="mt-2 text-amber-100/80 text-[clamp(0.75rem,3.2vw,1rem)] tracking-wide">
                English &amp; Luganda &bull; Pray &bull; Read &bull; Grow
              </p>
            </motion.div>

            {/* Loader — sits in flow, not absolutely positioned, so it never overlaps the art */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex shrink-0 flex-col items-center gap-3"
              aria-hidden
            >
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.15, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    className="block h-2 w-2 rounded-full bg-amber-300"
                  />
                ))}
              </div>
              {/* Progress bar — fills over the 2.8s splash lifetime */}
              <div className="h-1 w-40 overflow-hidden rounded-full bg-white/20 sm:w-52 md:w-64">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.4, ease: 'easeInOut' }}
                  className="h-full rounded-full bg-amber-400"
                />
              </div>
              <p className="text-[11px] sm:text-xs tracking-widest text-white/60 uppercase">
                Tap anywhere to continue
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
