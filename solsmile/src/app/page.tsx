'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import { useSupabase } from './providers/SupabaseProvider';
import { useGemini } from './providers/GeminiProvider';
import { useSmartContract } from './hooks/useSmartContract';
import { useTokenBalance } from './hooks/useTokenBalance';
import SmileGallery from './components/SmileGallery';

export default function Home() {
  const wallet = useWallet();
  const { uploadImage, saveSmileScore } = useSupabase();
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
    setSmileScore(null);
  };

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
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
          Based Smiles
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Share your smile, earn USDC rewards on Solana
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 transition-colors" />
      </div>

      {wallet.connected && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-lg mx-auto mb-8">
          {/* Balance Display */}
          <div className="flex justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Your Balance</p>
              <p className="text-xl font-bold">
                {balanceLoading ? '...' : userBalance !== null ? `${userBalance.toFixed(2)} USDC` : '0.00 USDC'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Pool Balance</p>
              <p className="text-xl font-bold">
                {balanceLoading ? '...' : poolBalance !== null ? `${poolBalance.toFixed(2)} USDC` : '0.00 USDC'}
              </p>
            </div>
          </div>
          
          {/* Donation Section */}
          <div className="mb-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="text-lg font-medium mb-2 text-center">Support the Smile Pool</h3>
            <div className="flex items-center">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={donateAmount}
                onChange={(e) => setDonateAmount(e.target.value)}
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-800"
                disabled={isDonating}
              />
              <button
                onClick={handleDonate}
                disabled={isDonating || !wallet.connected}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-r-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isDonating ? 'Donating...' : 'Donate USDC'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload your smiling selfie
              </label>
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
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 cursor-pointer transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Choose Image
              </label>
            </div>

            {imagePreview && (
              <div className="mt-4">
                <div className="relative w-64 h-64 mx-auto rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={handleAnalyzeSmile}
                  disabled={isAnalyzing || isUploading || !selectedFile}
                  className="mt-4 w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isAnalyzing ? 'Analyzing...' : isUploading ? 'Uploading...' : 'Analyze Smile'}
                </button>
              </div>
            )}

            {smileScore !== null && (
              <div className="text-center mt-4">
                <p className="text-lg font-medium mb-2">
                  Smile Score: {smileScore.toFixed(1)} / 10
                </p>
                {smileScore >= 5 ? (
                  <div>
                    <p className="text-green-600 dark:text-green-400 mb-4">
                      Congratulations! You're eligible for a USDC reward!
                    </p>
                    <button
                      onClick={handleClaimReward}
                      className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      Claim 0.01 USDC Reward
                    </button>
                  </div>
                ) : (
                  <p className="text-yellow-600 dark:text-yellow-400">
                    Try again with a bigger smile! 😊
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!wallet.connected && (
        <div className="text-center text-gray-600 dark:text-gray-400 mt-8">
          Connect your wallet to start earning rewards for your smile!
        </div>
      )}

      <SmileGallery />
    </main>
  );
}
