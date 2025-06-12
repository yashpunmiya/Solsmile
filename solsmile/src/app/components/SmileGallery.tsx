'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FiAward, FiCalendar, FiStar } from 'react-icons/fi';

interface SmileImage {
  url: string;
  score: number;
  created_at: string;
}

// Mock data for gallery
const mockImages: SmileImage[] = [
  {
    url: 'https://images.unsplash.com/photo-1573007974656-b958089e9f7b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80',
    score: 9.5,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
  },
  {
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80',
    score: 8.7,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() // 5 hours ago
  },
  {
    url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80',
    score: 7.8,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString() // 8 hours ago
  },
  {
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80',
    score: 9.2,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString() // 12 hours ago
  },
  {
    url: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80',
    score: 8.5,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
  },
  {
    url: 'https://images.unsplash.com/photo-1545167622-3a6ac756afa4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80',
    score: 8.9,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString() // 1.5 days ago
  }
];

export default function SmileGallery() {
  const [images, setImages] = useState<SmileImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchImages = async () => {
      try {
        const { data, error } = await supabase
          .from('smile_images')
          .select('*')
          .gte('score', 5)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Combine real data with mock data if real data is empty or has few entries
        if (!data || data.length < 3) {
          setImages(mockImages);
        } else {
          setImages(data);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
        // Fallback to mock data on error
        setImages(mockImages);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Function to format date in a friendly way
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
      }
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="mt-16 mb-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text inline-block">
          <FiAward className="inline-block mr-2 text-purple-600" />
          Winning Smiles
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Check out these amazing smiles from our community members who earned USDC rewards!
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {images.map((image, index) => (
          <div 
            key={index} 
            className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-700 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          >
            <div className="aspect-square relative group">
              <img
                src={image.url}
                alt={`Smile ${index + 1}`}
                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
              />
              {/* Score badge */}
              <div className="absolute top-3 right-3 bg-white dark:bg-gray-800 rounded-full px-3 py-1 shadow-md flex items-center">
                <FiStar className="text-yellow-500 mr-1" />
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {image.score.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Reward: 0.01 USDC
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                  <FiCalendar className="mr-1" />
                  {formatDate(image.created_at)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}