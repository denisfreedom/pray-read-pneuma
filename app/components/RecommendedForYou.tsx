'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, TrendingUp, Sparkles, Lightbulb } from 'lucide-react';
import Link from 'next/link';

interface Recommendation {
  book_id: number;
  book_name: string;
  book_number: number;
  chapter: number;
  reason: string;
  difficulty: string;
  theological_insight?: string;
}

export default function RecommendedForYou() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Get user email from session/localStorage
    const email = localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail');
    setUserEmail(email);

    if (email) {
      fetchRecommendations(email);
    } else {
      // Show default recommendations for non-logged-in users
      setLoading(false);
    }
  }, []);

  const fetchRecommendations = async (email: string) => {
    try {
      const response = await fetch(`/api/recommendations?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (data.recommendations) {
        // Fetch book theological insights for each recommendation
        const recsWithInsights = await Promise.all(
          data.recommendations.map(async (rec: Recommendation) => {
            try {
              const insightRes = await fetch(`/api/book-theological-insights?book_id=${rec.book_id}`);
              const insightData = await insightRes.json();
              
              return {
                ...rec,
                theological_insight: insightData?.english_insight || null
              };
            } catch (error) {
              console.error(`Error fetching insight for book ${rec.book_id}:`, error);
              return rec;
            }
          })
        );
        
        setRecommendations(recsWithInsights);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!userEmail || recommendations.length === 0) {
    return null; // Don't show section if no user or no recommendations
  }

  const difficultyColors = {
    beginner: 'from-green-500 to-emerald-500',
    intermediate: 'from-amber-500 to-orange-500',
    advanced: 'from-red-500 to-pink-500',
  };

  return (
    <div className="w-full bg-gradient-to-b from-indigo-900/30 to-purple-900/30 backdrop-blur-sm border-t border-indigo-400/20 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-indigo-500/20 backdrop-blur-sm border border-indigo-400/30 rounded-full">
            <Sparkles className="w-4 h-4 text-indigo-300" />
            <span className="text-indigo-300 text-sm font-medium">Personalized for You</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Recommended <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">for You</span>
          </h2>
          <p className="text-gray-200 text-base sm:text-lg max-w-2xl mx-auto">
            Based on your reading history and spiritual journey
          </p>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
          </div>
        )}

        {/* Recommendations Grid */}
        {!loading && recommendations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((rec, index) => (
              <motion.div
                key={rec.book_id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
              >
                <Link href={`/bible-reader/${rec.book_number}/${rec.chapter}`}>
                  <div className="group relative h-full p-6 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 hover:border-indigo-400/50 transition-all duration-300 cursor-pointer overflow-hidden">
                    {/* Background gradient on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    {/* Content */}
                    <div className="relative z-10">
                      {/* Difficulty Badge */}
                      <div className="mb-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${difficultyColors[rec.difficulty as keyof typeof difficultyColors]}`}>
                          {rec.difficulty.charAt(0).toUpperCase() + rec.difficulty.slice(1)}
                        </span>
                      </div>

                      {/* Book Icon */}
                      <div className="mb-4 inline-flex">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/10 border border-indigo-400/30 group-hover:border-indigo-400/60 transition-all duration-300">
                          <BookOpen className="w-6 h-6 text-indigo-400" />
                        </div>
                      </div>

                      {/* Book Name */}
                      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-indigo-300 transition-colors duration-300">
                        {rec.book_name}
                      </h3>

                      {/* Chapter */}
                      <p className="text-indigo-300 text-sm font-medium mb-3">
                        Chapter {rec.chapter}
                      </p>

                      {/* Reason */}
                      <p className="text-gray-400 text-sm mb-3 flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                        {rec.reason}
                      </p>

                      {/* Theological Insight */}
                      {rec.theological_insight && (
                        <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-400/20 rounded-lg">
                          <div className="flex items-start gap-2 mb-1">
                            <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs font-semibold text-amber-300">Theological Insight</p>
                          </div>
                          <p 
                            className="text-gray-300 text-xs leading-relaxed line-clamp-3"
                            dangerouslySetInnerHTML={{ __html: rec.theological_insight }}
                          />
                        </div>
                      )}

                      {/* Read Button */}
                      <button className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium text-sm hover:from-indigo-500 hover:to-purple-500 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-indigo-500/20 flex items-center justify-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Start Reading
                      </button>
                    </div>

                    {/* Bottom border glow */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
