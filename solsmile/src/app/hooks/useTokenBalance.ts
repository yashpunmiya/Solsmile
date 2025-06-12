import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { USDC_MINT, getPoolAuthority } from '../config/anchor';

export const useTokenBalance = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [poolBalance, setPoolBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalances = async () => {
    if (!wallet.publicKey) return;
    
    setLoading(true);
    try {
      // Get user token account
      const userTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        wallet.publicKey
      );
      
      // Get pool token account
      const poolAuthority = getPoolAuthority();
      const poolTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        poolAuthority,
        true // allowOwnerOffCurve
      );
      
      // Fetch balances
      try {
        const userAccount = await getAccount(connection, userTokenAccount);
        setUserBalance(Number(userAccount.amount) / 1000000); // Convert from lamports to USDC
      } catch (e) {
        // Account might not exist yet
        setUserBalance(0);
      }
      
      try {
        const poolAccount = await getAccount(connection, poolTokenAccount);
        setPoolBalance(Number(poolAccount.amount) / 1000000);
      } catch (e) {
        setPoolBalance(0);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wallet.connected) {
      fetchBalances();
    }
  }, [wallet.connected, connection]);

  return { userBalance, poolBalance, loading, refreshBalances: fetchBalances };
};