'use client';

import { motion } from 'framer-motion';
import { BookOpen, Users, Heart, Sparkles, ArrowRight, Search, Bookmark, Calendar, Flame, Grid, BookMarked, FileText, Clock, Lightbulb, MessageCircle, Link as LinkIcon, HelpCircle, Music, Download, Smartphone } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import VerseOfTheDayModal from '@/components/VerseOfTheDayModal';
import AuthProtectedLink from '@/components/AuthProtectedLink';
import OfflineManager from '@/components/OfflineManager';
import ThemeToggle from '@/components/ThemeToggle';
import AppFooter from '@/app/components/AppFooter';
import RecommendedForYou from '@/app/components/RecommendedForYou';

export default function Home() {
  const [particles, setParticles] = useState<Array<{x: number, y: number, scale: number}>>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Mark component as mounted to prevent hydration mismatch
    setIsMounted(true);
    
    // Generate particles only on client side - after mount
    // Use actual window dimensions
    const width = window.innerWidth || 800;
    const height = window.innerHeight || 600;
    
    setParticles([...Array(20)].map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      scale: Math.random() * 0.5 + 0.5
    })));
  }, []);

  return (
    <>
      <VerseOfTheDayModal />
      <OfflineManager />
      <div className="min-h-screen relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/70 to-slate-900/90"></div>
      </div>

      {/* Animated Particles */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {isMounted && particles.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-300/30 rounded-full"
            initial={{ 
              x: particle.x, 
              y: particle.y,
              scale: particle.scale
            }}
            animate={{
              y: [null, particle.y + (Math.random() * 200 - 100)],
              x: [null, particle.x + (Math.random() * 200 - 100)],
              opacity: [0.2, 0.5, 0.2],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="w-full px-3 sm:px-6 lg:px-8 pt-8 pb-3 sm:pt-10 sm:pb-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <motion.div 
              className="flex items-center gap-2 sm:gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link href="/" className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-14 sm:h-14 relative transform hover:scale-110 transition-transform duration-300">
                  <Image 
                    src="https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1779376257485_pgg34c.png"
                    alt="Pray-Read Bible Logo"
                    width={56}
                    height={56}
                    className="object-contain drop-shadow-lg"
                  />
                </div>
                <span className="hidden sm:inline text-lg sm:text-xl font-bold text-white">Pray-Read Bible</span>
              </Link>
            </motion.div>

            <motion.div 
              className="flex items-center gap-1 xs:gap-2 sm:gap-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <ThemeToggle />
              <Link href="/about">
                <motion.button 
                  className="px-2 py-1.5 xs:px-3 xs:py-2 sm:px-4 sm:py-2 text-xs xs:text-sm sm:text-base text-white hover:text-amber-300 transition-all duration-300 font-medium relative group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  About
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-amber-400 group-hover:w-full transition-all duration-300"></span>
                </motion.button>
              </Link>
              <Link href="/community">
                <motion.button 
                  className="hidden xs:block px-2 py-1.5 xs:px-3 xs:py-2 sm:px-4 sm:py-2 text-xs xs:text-sm sm:text-base text-white hover:text-amber-300 transition-all duration-300 font-medium relative group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Community
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-amber-400 group-hover:w-full transition-all duration-300"></span>
                </motion.button>
              </Link>
              <Link href="/qa">
                <motion.button 
                  className="hidden sm:block px-2 py-1.5 xs:px-3 xs:py-2 sm:px-4 sm:py-2 text-xs xs:text-sm sm:text-base text-white hover:text-amber-300 transition-all duration-300 font-medium relative group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Q&amp;A
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-amber-400 group-hover:w-full transition-all duration-300"></span>
                </motion.button>
              </Link>

              <a href="https://store.pesapal.com/donatetoprayreadbibleproject" target="_blank" rel="noopener noreferrer">
                <motion.button 
                  className="px-2 py-1.5 xs:px-3 xs:py-2 sm:px-4 sm:py-2 text-xs xs:text-sm sm:text-base bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all shadow-md hover:shadow-xl active:scale-95 font-medium flex items-center gap-1 sm:gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Heart className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Donate</span>
                </motion.button>
              </a>
              <Link href="/signup">
                <motion.button 
                  className="px-2.5 py-1.5 xs:px-4 xs:py-2 sm:px-6 sm:py-2.5 text-xs xs:text-sm sm:text-base bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full font-semibold shadow-lg shadow-amber-500/40 hover:shadow-xl hover:shadow-amber-500/60 transform hover:scale-105 transition-all duration-300"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Sign Up
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-20">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-4 sm:mb-8"
            >
              <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-6 sm:py-2 bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 rounded-full text-amber-300 text-[10px] xs:text-xs sm:text-sm font-medium shadow-lg shadow-amber-500/20">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                ✦ OUR STORY & VISION ✦
              </span>
            </motion.div>

            <motion.h1
              className="text-2xl xs:text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-3 sm:mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <span className="text-white drop-shadow-2xl">Experiencing Christ</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-300 drop-shadow-2xl italic font-serif">
                as Living Word
              </span>
            </motion.h1>

            <motion.p
              className="text-sm xs:text-base sm:text-xl lg:text-2xl text-gray-200 mb-6 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-2 sm:px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              Pray-Read is a digital sanctuary — a living Altar where the Word of God
              ceases to be mere text and becomes <span className="italic font-serif text-amber-300">Spirit and Life</span> in the daily
              experience of every believer.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <AuthProtectedLink href="/bible-reader">
                <motion.button
                  className="group relative px-5 py-2.5 xs:px-6 xs:py-3 sm:px-8 sm:py-4 text-sm xs:text-base sm:text-lg bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white font-bold rounded-full shadow-2xl shadow-amber-500/50 overflow-hidden w-full sm:w-auto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                  <span className="relative flex items-center justify-center gap-2">
                    Open the Word
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                  <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 blur-xl bg-amber-300/40 transition-opacity duration-500"></span>
                </motion.button>
              </AuthProtectedLink>

              <Link href="/community">
                <motion.button
                  className="group px-5 py-2.5 xs:px-6 xs:py-3 sm:px-8 sm:py-4 text-sm xs:text-base sm:text-lg bg-white/10 backdrop-blur-md text-white font-semibold rounded-full border-2 border-white/30 hover:bg-white/20 hover:border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300 w-full sm:w-auto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="flex items-center justify-center gap-2">
                    Join Community
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform duration-300" />
                  </span>
                </motion.button>
              </Link>
            </motion.div>

            {/* PWA Install Banner */}
            <motion.div
              className="mt-8 sm:mt-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Link href="/install-prompt">
                <div className="group max-w-2xl mx-auto p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-md border border-blue-400/30 hover:border-blue-400/60 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Smartphone className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-sm sm:text-lg mb-1 flex items-center gap-2">
                        Install Our App
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-300 border border-green-400/30">
                          FREE
                        </span>
                      </h3>
                      <p className="text-gray-300 text-xs sm:text-sm">
                        Read offline, faster loading, home screen access
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Download className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Feature Pills */}
            <motion.div
              className="mt-10 sm:mt-16 md:mt-20 flex flex-wrap items-center justify-center gap-2 xs:gap-3 sm:gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              {[
                { icon: BookOpen, text: 'Interactive Bible Study', color: 'from-blue-500 to-cyan-500', link: '/bible-reader' },
                { icon: Music, text: 'Verse-Songs', color: 'from-purple-500 to-pink-500', link: '/verse-songs' },
                { icon: Heart, text: 'Daily Devotionals', color: 'from-rose-500 to-red-500', link: '/devotional-plans' },
              ].map((feature, index) => (
                <Link key={index} href={feature.link}>
                  <motion.div
                    className="group relative px-2.5 py-1.5 xs:px-4 xs:py-2 sm:px-6 sm:py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-full hover:bg-white/10 hover:border-white/40 transition-all duration-300 cursor-pointer"
                    whileHover={{ scale: 1.05, y: -2 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.9 + index * 0.1 }}
                  >
                    <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3">
                      <div className={`p-1 xs:p-1.5 sm:p-2 rounded-full bg-gradient-to-br ${feature.color} group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-4 sm:h-4 text-white" />
                      </div>
                      <span className="text-white text-[10px] xs:text-xs sm:text-sm font-medium">{feature.text}</span>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 hidden sm:block"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1, repeat: Infinity, repeatType: "reverse" }}
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
            <motion.div
              className="w-1.5 h-1.5 bg-amber-400 rounded-full"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </div>

      {/* Recommended for You Section */}
      <RecommendedForYou />

      {/* Devotional Plans Highlight Section */}
      <div className="relative z-10 w-full bg-gradient-to-b from-purple-900/30 to-blue-900/30 backdrop-blur-sm border-t border-purple-400/20 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              Daily <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">Devotional Plans</span>
            </h2>
            <p className="text-gray-200 text-base sm:text-lg max-w-2xl mx-auto">
              Discover inspiring devotional journeys designed to deepen your faith and strengthen your walk with God
            </p>
          </motion.div>

          <div className="flex justify-center">
            <Link href="/devotional-plans">
              <motion.button
                className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-full shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 transition-all duration-300 flex items-center gap-3 text-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Calendar className="w-6 h-6" />
                Explore Devotional Plans
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </motion.button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Overview Section */}
      <div className="relative z-10 w-full bg-gradient-to-b from-slate-900/50 to-slate-950/80 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 md:py-28">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              Powerful <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">Bible Features</span>
            </h2>
            <p className="text-gray-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              Explore all the tools available to deepen your Bible study and spiritual journey
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: Search,
                title: 'Full-Text Search',
                description: 'Search across all Bible verses using keywords or phrases',
                link: '/bible-reader',
                buttonText: 'Try Now'
              },
              {
                icon: Bookmark,
                title: 'Bookmarks',
                description: 'Save your favorite verses for quick reference and study',
                link: '/dashboard',
                buttonText: 'View Bookmarks'
              },
              {
                icon: Calendar,
                title: 'Devotional Plans',
                description: 'Inspiring devotional journeys with scripture and meditation',
                link: '/devotional-plans',
                buttonText: 'View Plans'
              },
              {
                icon: Flame,
                title: 'Prayer Passages',
                description: 'Inspirational prayers and passages for daily devotion',
                link: '/bible-reader',
                buttonText: 'Explore'
              },
              {
                icon: Grid,
                title: 'Verse Collections',
                description: 'Organize verses into themed collections for study',
                link: '/verse-collections',
                buttonText: 'Create Collection'
              },
              {
                icon: BookMarked,
                title: 'Commentary',
                description: 'Deep scholarly insights and explanations for each verse',
                link: '/bible-reader',
                buttonText: 'Read Commentary'
              },
              {
                icon: FileText,
                title: 'Verse Notes',
                description: 'Add personal study notes and annotations to verses',
                link: '/bible-reader',
                buttonText: 'Take Notes'
              },
              {
                icon: Clock,
                title: 'Historical Context',
                description: 'Understand the cultural and historical background of scriptures',
                link: '/historical-context',
                buttonText: 'Learn More'
              },
              {
                icon: Lightbulb,
                title: 'Theological Insights',
                description: 'Explore doctrinal analysis and biblical themes',
                link: '/theological-insights',
                buttonText: 'Discover'
              },
              {
                icon: HelpCircle,
                title: 'Study Questions',
                description: 'Reflection prompts to deepen your understanding',
                link: '/qa',
                buttonText: 'Start Study'
              },
              {
                icon: LinkIcon,
                title: 'Cross References',
                description: 'Find related verses that connect and reinforce concepts',
                link: '/bible-reader',
                buttonText: 'View Links'
              },
              {
                icon: Music,
                title: 'Verse-Songs',
                description: 'Listen to Bible verses turned into beautiful worship songs',
                link: '/verse-songs',
                buttonText: 'Listen Now'
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true, margin: "-100px" }}
                whileHover={{ y: -8 }}
              >
                <Link href={feature.link}>
                  <div className="group relative h-full p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 hover:border-amber-400/50 transition-all duration-300 cursor-pointer overflow-hidden">
                    {/* Background gradient on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col h-full">
                      {/* Icon */}
                      <div className="mb-4 inline-flex">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-400/30 group-hover:border-amber-400/60 group-hover:from-amber-500/30 transition-all duration-300">
                          <feature.icon className="w-6 h-6 text-amber-400" />
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 group-hover:text-amber-300 transition-colors duration-300">
                        {feature.title}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-400 text-sm sm:text-base flex-grow mb-6">
                        {feature.description}
                      </p>

                      {/* Button */}
                      <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg font-medium text-sm hover:from-amber-500 hover:to-amber-600 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-amber-500/20">
                        {feature.buttonText}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </button>
                    </div>

                    {/* Bottom border glow */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true, margin: "-100px" }}
            className="mt-12 sm:mt-20 text-center"
          >
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <AuthProtectedLink href="/bible-reader">
                <motion.button
                  className="group relative px-8 sm:px-12 py-3 sm:py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-full shadow-2xl shadow-amber-500/50 hover:shadow-amber-500/70 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="relative flex items-center gap-2">
                    Start Exploring All Features
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                </motion.button>
              </AuthProtectedLink>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
    <AppFooter />
    </>
  );
}
