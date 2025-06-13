'use client';

import { FC, ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface SmileImage {
  url: string;
  score: number;
  created_at: string;
}

interface LocalStorageContextType {
  uploadImage: (file: File) => Promise<string>;
  saveSmileScore: (imageUrl: string, score: number) => Promise<void>;
  getSmileImages: () => Promise<SmileImage[]>;
}

const LocalStorageContext = createContext<LocalStorageContextType | undefined>(undefined);

interface Props {
  children: ReactNode;
}

export const LocalStorageProvider: FC<Props> = ({ children }) => {
  // Initialize local storage on client side
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    // Initialize smile_images in localStorage if it doesn't exist
    if (typeof window !== 'undefined' && !localStorage.getItem('smile_images')) {
      localStorage.setItem('smile_images', JSON.stringify([]));
    }
  }, []);

  const uploadImage = async (file: File): Promise<string> => {
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            // Use data URL directly instead of storing in Supabase
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert file to data URL'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const saveSmileScore = async (imageUrl: string, score: number): Promise<void> => {
    try {
      if (!isClient) return;
      
      const newImage: SmileImage = {
        url: imageUrl,
        score: score,
        created_at: new Date().toISOString()
      };
      
      // Get existing images from localStorage
      const existingImagesJson = localStorage.getItem('smile_images') || '[]';
      const existingImages: SmileImage[] = JSON.parse(existingImagesJson);
      
      // Add new image to the beginning of the array
      existingImages.unshift(newImage);
      
      // Save back to localStorage
      localStorage.setItem('smile_images', JSON.stringify(existingImages));
    } catch (error) {
      console.error('Error saving smile score:', error);
      throw error;
    }
  };

  const getSmileImages = async (): Promise<SmileImage[]> => {
    try {
      if (!isClient) return [];
      
      // Get images from localStorage
      const imagesJson = localStorage.getItem('smile_images') || '[]';
      const images: SmileImage[] = JSON.parse(imagesJson);
      
      // Filter images with score >= 5 and sort by created_at (newest first)
      return images
        .filter(img => img.score >= 5)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      console.error('Error fetching smile images:', error);
      return [];
    }
  };

  return (
    <LocalStorageContext.Provider value={{ uploadImage, saveSmileScore, getSmileImages }}>
      {children}
    </LocalStorageContext.Provider>
  );
};

export const useLocalStorage = () => {
  const context = useContext(LocalStorageContext);
  if (context === undefined) {
    throw new Error('useLocalStorage must be used within a LocalStorageProvider');
  }
  return context;
};