'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect, useRef } from 'react';
import { useLocalStorage } from './providers/LocalStorageProvider';
import { useGemini } from './providers/GeminiProvider';
import { useSmartContract } from './hooks/useSmartContract';
import { useTokenBalance } from './hooks/useTokenBalance';
import SmileGallery from './components/SmileGallery';
import { FiCamera, FiUpload, FiImage, FiDollarSign, FiSmile } from 'react-icons/fi';

export default function Home() {
  const wallet = useWallet();
  const { uploadImage, saveSmileScore } = useLocalStorage();
  const { analyzeSmile } = useGemini();
  const { claimReward, donate } = useSmartContract();
  const { userBalance, poolBalance, loading: balanceLoading, refreshBalances } = useTokenBalance();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [smileScore, setSmileScore] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [donateAmount, setDonateAmount] = useState<string>('1');
  const [isDonating, setIsDonating] = useState(false);
  const [inputMethod, setInputMethod] = useState<'upload' | 'camera'>('upload');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Handle file selection from upload
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
    setSmileScore(null);
  };

  // Handle camera activation
  const activateCamera = async () => {
    setInputMethod('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      // Fallback to upload if camera fails
      setInputMethod('upload');
    }
  };

  // Handle camera deactivation
  const deactivateCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  // Handle capture from camera
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the current video frame to the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            // Create a File object from the blob
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            setSelectedFile(file);
            
            // Create and set preview URL
            const imageUrl = URL.createObjectURL(blob);
            setImagePreview(imageUrl);
            setSmileScore(null);
            
            // Deactivate camera after capture
            deactivateCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      deactivateCamera();
    };
  }, []);

  const handleAnalyzeSmile = async () => {
    if (!selectedFile || !imagePreview) return;

    try {
      setIsAnalyzing(true);
      // First analyze the smile using the local preview URL
      const score = await analyzeSmile(imagePreview);
      setSmileScore(score);

      // Only upload to Supabase if score is sufficient
      if (score >= 5) {
        setIsUploading(true);
        const imageUrl = await uploadImage(selectedFile);
        await saveSmileScore(imageUrl, score);
        // Show confetti for high scores
        if (score >= 8) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }
      }
    } catch (error) {
      console.error('Error analyzing smile:', error);
    } finally {
      setIsAnalyzing(false);
      setIsUploading(false);
    }
  };

  const handleClaimReward = async () => {
    if (!wallet.connected || !smileScore || smileScore < 5) return;

    try {
      const result = await claimReward();
      console.log('Reward claimed successfully:', result.signature);
      // Refresh balances after claiming
      refreshBalances();
    } catch (error) {
      console.error('Error claiming reward:', error);
    }
  };

  const handleDonate = async () => {
    if (!wallet.connected || !donateAmount) return;
    
    try {
      setIsDonating(true);
      const amount = parseFloat(donateAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid donation amount');
      }
      
      const result = await donate(amount);
      console.log('Donation successful:', result.signature);
      // Refresh balances after donating
      refreshBalances();
      // Reset donation amount
      setDonateAmount('1');
    } catch (error) {
      console.error('Error donating:', error);
    } finally {
      setIsDonating(false);
    }
  };

  // Refresh balances when wallet connects
  useEffect(() => {
    if (wallet.connected) {
      refreshBalances();
    }
  }, [wallet.connected, refreshBalances]);

  return (
    <main className="min-h-screen container mx-auto px-4 py-8 max-w-4xl">
      {/* Confetti effect for high scores */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {/* This would be replaced with a proper confetti animation component */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl animate-bounce">🎉</div>
          </div>
        </div>
      )}
      
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 text-transparent bg-clip-text animate-gradient-x">
          SolSmile
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto">
          Share your smile, earn USDC rewards on Solana
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 hover:!from-purple-700 hover:!to-pink-700 !shadow-lg !rounded-xl !px-6 !py-3 !transition-all !duration-300 !transform hover:!scale-105" />
      </div>

      {wallet.connected && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-lg mx-auto mb-12 border border-gray-100 dark:border-gray-700 transform transition-all duration-300 hover:shadow-purple-100 dark:hover:shadow-purple-900/20">
          {/* Balance Display */}
          <div className="flex justify-between mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-800 rounded-xl shadow-inner">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2 text-purple-600 dark:text-purple-400">
                <FiDollarSign className="mr-1" />
                <p className="text-sm font-medium">Your Balance</p>
              </div>
              <p className="text-2xl font-bold">
                {balanceLoading ? '...' : userBalance !== null ? `${userBalance.toFixed(2)} USDC` : '0.00 USDC'}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2 text-pink-600 dark:text-pink-400">
                <FiSmile className="mr-1" />
                <p className="text-sm font-medium">Pool Balance</p>
              </div>
              <p className="text-2xl font-bold">
                {balanceLoading ? '...' : poolBalance !== null ? `${poolBalance.toFixed(2) - 99999900} USDC` : '0.00 USDC'}
              </p>
            </div>
          </div>
          
          {/* Donation Section */}
          <div className="mb-8 p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
            <h3 className="text-lg font-medium mb-4 text-center flex items-center justify-center">
              <FiDollarSign className="mr-2 text-green-500" />
              Support the Smile Pool
            </h3>
            <div className="flex items-center">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={donateAmount}
                onChange={(e) => setDonateAmount(e.target.value)}
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-l-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                disabled={isDonating}
              />
              <button
                onClick={handleDonate}
                disabled={isDonating || !wallet.connected}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-r-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
              >
                {isDonating ? 'Donating...' : 'Donate USDC'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
                Capture your smiling selfie
              </label>
              
              {/* Input method toggle */}
              <div className="flex justify-center space-x-4 mb-6">
                <button 
                  onClick={() => {
                    setInputMethod('upload');
                    deactivateCamera();
                  }}
                  className={`flex items-center px-4 py-2 rounded-lg transition-all ${inputMethod === 'upload' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                >
                  <FiUpload className="mr-2" />
                  Upload
                </button>
                <button 
                  onClick={activateCamera}
                  className={`flex items-center px-4 py-2 rounded-lg transition-all ${inputMethod === 'camera' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                >
                  <FiCamera className="mr-2" />
                  Camera
                </button>
              </div>
              
              {/* File upload input */}
              {inputMethod === 'upload' && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                    disabled={isAnalyzing || isUploading}
                  />
                  <label
                    htmlFor="image-upload"
                    className="inline-flex items-center px-6 py-3 border-2 border-dashed border-purple-300 dark:border-purple-700 text-base font-medium rounded-xl text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-gray-700 cursor-pointer transition-colors w-full justify-center"
                  >
                    <FiImage className="mr-2 text-xl" />
                    Choose Image
                  </label>
                </div>
              )}
              
              {/* Camera input */}
              {inputMethod === 'camera' && (
                <div className="relative">
                  <div className="rounded-xl overflow-hidden bg-black aspect-square max-w-sm mx-auto">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  
                  <button
                    onClick={captureImage}
                    disabled={!cameraActive}
                    className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center mx-auto"
                  >
                    <FiCamera className="mr-2" />
                    Capture Smile
                  </button>
                </div>
              )}
            </div>

            {imagePreview && (
              <div className="mt-6">
                <div className="relative w-64 h-64 mx-auto rounded-xl overflow-hidden ring-4 ring-purple-200 dark:ring-purple-900">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={handleAnalyzeSmile}
                  disabled={isAnalyzing || isUploading || !selectedFile}
                  className="mt-6 w-full px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-md"
                >
                  {isAnalyzing ? 'Analyzing...' : isUploading ? 'Uploading...' : 'Analyze Smile'}
                </button>
              </div>
            )}

            {smileScore !== null && (
              <div className="text-center mt-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="mb-4">
                  <div className="text-2xl font-bold mb-2 text-purple-600 dark:text-purple-400">
                    Smile Score: {smileScore.toFixed(1)} / 10
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 mb-4">
                    <div 
                      className={`h-4 rounded-full ${smileScore >= 8 ? 'bg-green-500' : smileScore >= 5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${smileScore * 10}%` }}
                    ></div>
                  </div>
                </div>
                
                {smileScore >= 5 ? (
                  <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-xl">
                    <p className="text-green-600 dark:text-green-400 mb-4 font-medium">
                      Congratulations! You're eligible for a USDC reward! 🎉
                    </p>
                    <button
                      onClick={handleClaimReward}
                      className="w-full px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-md"
                    >
                      Claim 0.01 USDC Reward
                    </button>
                  </div>
                ) : (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-xl">
                    <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                      Try again with a bigger smile! 😊
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!wallet.connected && (
        <div className="text-center bg-purple-50 dark:bg-purple-900/20 p-8 rounded-2xl shadow-md max-w-lg mx-auto mb-12">
          <FiSmile className="mx-auto text-5xl mb-4 text-purple-500" />
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Connect your wallet to start earning rewards for your smile!
          </p>
        </div>
      )}

      <SmileGallery />
    </main>
  );
}
