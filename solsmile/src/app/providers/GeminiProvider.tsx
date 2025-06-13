'use client';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { FC, ReactNode, createContext, useContext } from 'react';

interface GeminiContextType {
    analyzeSmile: (imageUrl: string) => Promise<number>;
}

const GeminiContext = createContext<GeminiContextType | undefined>(undefined);

interface Props {
    children: ReactNode;
}

export const GeminiProvider: FC<Props> = ({ children }) => {
    // Use the API key from environment variables
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey) {
        console.error('NEXT_PUBLIC_GEMINI_API_KEY is not defined in environment variables');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey || '');

    const analyzeSmile = async (imageUrl: string): Promise<number> => {
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            
            // For data URLs, we can extract base64 directly
            let imageData: string;
            if (imageUrl.startsWith('data:')) {
                imageData = imageUrl.split(',')[1];
            } else {
                // For remote URLs, fetch and convert to base64
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                imageData = await blobToBase64(blob);
            }
            
            const result = await model.generateContent([
                'Analyze this selfie and rate the smile on a scale of 0-10, where 0 means no smile and 10 means a full genuine smile. Return only the numeric score.',
                {
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: imageData
                    }
                }
            ]);

            const response_text = await result.response.text();
            const score = parseFloat(response_text);
            return isNaN(score) ? 0 : Math.min(Math.max(score, 0), 10);
        } catch (error) {
            console.error('Error analyzing smile:', error);
            throw error; // Propagate error to handle in component
        }
    };

    return (
        <GeminiContext.Provider value={{ analyzeSmile }}>
            {children}
        </GeminiContext.Provider>
    );
};

export const useGemini = () => {
    const context = useContext(GeminiContext);
    if (context === undefined) {
        throw new Error('useGemini must be used within a GeminiProvider');
    }
    return context;
};

// Helper function to convert Blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error('Failed to convert blob to base64'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};