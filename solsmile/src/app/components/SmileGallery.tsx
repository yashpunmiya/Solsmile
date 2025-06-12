'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface SmileImage {
  url: string;
  score: number;
  created_at: string;
}

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
        setImages(data || []);
      } catch (error) {
        console.error('Error fetching images:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-center mb-6">Winning Smiles</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((image, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <div className="aspect-square relative">
              <img
                src={image.url}
                alt={`Smile ${index + 1}`}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Score: {image.score.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(image.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}