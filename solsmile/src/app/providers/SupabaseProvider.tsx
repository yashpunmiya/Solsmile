'use client';

import { createClient } from '@supabase/supabase-js';
import { FC, ReactNode, createContext, useContext } from 'react';

interface SmileImage {
  url: string;
  score: number;
  created_at: string;
}

interface SupabaseContextType {
  uploadImage: (file: File) => Promise<string>;
  saveSmileScore: (imageUrl: string, score: number) => Promise<void>;
  getSmileImages: () => Promise<SmileImage[]>;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

interface Props {
  children: ReactNode;
}

export const SupabaseProvider: FC<Props> = ({ children }) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const uploadImage = async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('smiles')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('smiles')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const saveSmileScore = async (imageUrl: string, score: number): Promise<void> => {
    try {
      const { error } = await supabase
        .from('smile_images')
        .insert([{
          url: imageUrl,
          score: score,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving smile score:', error);
      throw error;
    }
  };

  const getSmileImages = async (): Promise<SmileImage[]> => {
    try {
      const { data, error } = await supabase
        .from('smile_images')
        .select('*')
        .gte('score', 5)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching smile images:', error);
      return [];
    }
  };

  return (
    <SupabaseContext.Provider value={{ uploadImage, saveSmileScore, getSmileImages }}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};