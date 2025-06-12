import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import idl from '../idl/based_smiles.json';
import { Program, AnchorProvider, BN, web3 } from '@coral-xyz/anchor';
import { PROGRAM_ID, USDC_MINT, getUserStats, getPoolAuthority, TOKEN_PROGRAM } from '../config/anchor';
import { useCallback } from 'react';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';
import { Transaction, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair } from '@solana/web3.js';

export const useSmartContract = () => {
  const { connection } = useConnection();
  const wallet = useWallet();

  // Create USDC token account for the user
  const createTokenAccount = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      // Get the associated token account address
      const associatedTokenAddress = await getAssociatedTokenAddress(
        USDC_MINT,
        wallet.publicKey
      );

      // Check if the account already exists
      try {
        await connection.getAccountInfo(associatedTokenAddress);
        console.log('Token account already exists');
        return { success: true, address: associatedTokenAddress };
      } catch (error) {
        // Account doesn't exist, create it
        console.log('Token account does not exist, creating it...');
      }

      // Create a transaction to create the associated token account
      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey, // payer
          associatedTokenAddress, // associated token account
          wallet.publicKey, // owner
          USDC_MINT // mint
        )
      );

      // Sign and send the transaction
      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('Token account created successfully:', associatedTokenAddress.toString());
      return { success: true, address: associatedTokenAddress, signature };
    } catch (error) {
      console.error('Failed to create token account:', error);
      throw error;
    }
  }, [connection, wallet]);

  // Initialize user stats account using the new instruction
  const initializeUserStats = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      // Get the user stats PDA
      const [userStats, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_stats"), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );
      
      // Check if the account already exists
      const accountInfo = await connection.getAccountInfo(userStats);
      if (accountInfo) {
        console.log('User stats account already exists');
        return { success: true, address: userStats };
      }
      
      console.log('User stats account does not exist, creating it using the initialize_user_stats instruction...');
      
      // Create a provider to interact with the program
      const provider = new AnchorProvider(
        connection,
        {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions,
        },
        { commitment: 'confirmed' }
      );

      // Use the imported IDL
      const program = new Program(idl, PROGRAM_ID, provider);
      
      // Call the initialize_user_stats instruction
      const tx = await program.methods
        .initializeUserStats(bump)
        .accounts({
          user: wallet.publicKey,
          userStats: userStats,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log('User stats account initialized successfully:', userStats.toString());
      return { success: true, address: userStats, signature: tx };
    } catch (error) {
      console.error('Error initializing user stats account:', error);
      return { success: false, error };
    }
  }, [connection, wallet]);

  // Get the pool authority PDA
  const getPoolAuthority = useCallback(() => {
    const [poolAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool")],
      PROGRAM_ID
    );
    return poolAuthority;
  }, []);

  // Get the pool stats account
  const getPoolStats = useCallback(async () => {
    try {
      // First, get the pool authority PDA
      const poolAuthority = getPoolAuthority();
      
      // Log for debugging
      console.log('Looking for pool stats account with program ID:', PROGRAM_ID.toString());
      
      // Query all accounts owned by the program
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          // Filter for accounts with the correct size for PoolStats
          { dataSize: 56 } // 8 bytes for discriminator + 32 bytes for authority + 8 bytes for total_rewards + 8 bytes for total_claims
        ],
      });
      
      console.log('Found', accounts.length, 'program accounts with matching size');
      
      // If we found any accounts, return the first one
      if (accounts.length > 0) {
        console.log('Using existing pool stats account:', accounts[0].pubkey.toString());
        return accounts[0].pubkey;
      }
      
      // If no pool stats account found, return null
      console.log('No pool stats account found');
      return null;
    } catch (error) {
      console.error('Error getting pool stats account:', error);
      return null;
    }
  }, [connection, getPoolAuthority]);

  // Initialize pool stats account
  const initializePool = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      // Get the pool authority PDA
      const [poolAuthority, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool")],
        PROGRAM_ID
      );
      
      // Create a provider to interact with the program
      const provider = new AnchorProvider(
        connection,
        {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions,
        },
        { commitment: 'confirmed' }
      );

      // Use the imported IDL
      const program = new Program(idl, PROGRAM_ID, provider);
      
      // Create a new keypair for the pool stats account
      const poolStatsKeypair = Keypair.generate();
      
      console.log('Initializing pool with accounts:', {
        authority: wallet.publicKey.toString(),
        poolStats: poolStatsKeypair.publicKey.toString(),
        poolAuthority: poolAuthority.toString(),
      });
      
      // Call the initialize_pool instruction
      const tx = await program.methods
        .initializePool(bump)
        .accounts({
          authority: wallet.publicKey,
          poolStats: poolStatsKeypair.publicKey,
          poolAuthority: poolAuthority,
          systemProgram: SystemProgram.programId,
        })
        .signers([poolStatsKeypair])
        .rpc();
      
      console.log('Pool initialized successfully:', tx);
      
      // Wait for confirmation to ensure the account is available
      await connection.confirmTransaction(tx, 'confirmed');
      
      return { success: true, signature: tx, poolStats: poolStatsKeypair.publicKey };
    } catch (error) {
      console.error('Error initializing pool:', error);
      return { success: false, error };
    }
  }, [connection, wallet]);

  const claimReward = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      // First, ensure the user has a token account
      console.log('Creating or verifying token account...');
      const tokenResult = await createTokenAccount();
      if (!tokenResult.success) {
        console.error('Failed to create token account:', tokenResult.error);
        throw new Error('Failed to create token account');
      }
      
      // Get the user's USDC token account address
      const userTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        wallet.publicKey
      );
      
      // Explicitly verify the token account exists and is initialized
      try {
        console.log('Verifying token account is initialized...');
        const tokenAccountInfo = await getAccount(connection, userTokenAccount);
        console.log('Token account verified:', tokenAccountInfo.address.toString());
      } catch (error) {
        console.error('Token account verification failed:', error);
        
        // Try to create it again with explicit confirmation
        console.log('Attempting to create token account again...');
        const transaction = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey, // payer
            userTokenAccount, // associated token account
            wallet.publicKey, // owner
            USDC_MINT // mint
          )
        );
        
        transaction.feePayer = wallet.publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const signedTransaction = await wallet.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        await connection.confirmTransaction(signature, 'confirmed');
        
        // Wait a moment to ensure the account is properly initialized
        console.log('Waiting for token account to be confirmed...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify again
        try {
          await getAccount(connection, userTokenAccount);
          console.log('Token account created and verified successfully');
        } catch (verifyError) {
          console.error('Token account still not initialized after creation attempt:', verifyError);
          throw new Error('Failed to initialize token account');
        }
      }
      
      // Initialize user stats account if it doesn't exist
      const userStatsResult = await initializeUserStats();
      if (!userStatsResult.success) {
        console.error('Failed to initialize user stats account:', userStatsResult.error);
        throw new Error('Failed to initialize user stats account');
      }
      
      const provider = new AnchorProvider(
        connection,
        {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions,
        },
        { commitment: 'confirmed' }
      );

      // Use the imported IDL
      const program = new Program(idl, PROGRAM_ID, provider);
      const userStats = getUserStats(wallet.publicKey);
      
      // Get the pool authority PDA
      const poolAuthority = getPoolAuthority();
      const poolTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        poolAuthority,
        true // allowOwnerOffCurve
      );

      // Get the pool stats account
      let poolStats = await getPoolStats();
      
      // If pool stats account doesn't exist, initialize it
      if (!poolStats) {
        console.log('Pool stats account does not exist. Initializing it...');
        const initPoolResult = await initializePool();
        if (!initPoolResult.success) {
          console.error('Failed to initialize pool stats account:', initPoolResult.error);
          throw new Error('Failed to initialize pool stats account');
        }
        poolStats = initPoolResult.poolStats;
        
        // Wait a moment to ensure the account is properly initialized
        console.log('Waiting for pool stats account to be confirmed...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log('Claiming reward with accounts:', {
        user: wallet.publicKey.toString(),
        userStats: userStats.toString(),
        poolStats: poolStats.toString(),
        poolToken: poolTokenAccount.toString(),
        userToken: userTokenAccount.toString(),
        poolAuthority: poolAuthority.toString(),
        tokenProgram: TOKEN_PROGRAM.toString(),
      });

      // Now try to claim the reward
      try {
        const claimTx = await program.methods
          .claimReward()
          .accounts({
            user: wallet.publicKey,
            userStats,
            poolStats, // This is the pool stats account
            poolToken: poolTokenAccount,
            userToken: userTokenAccount,
            poolAuthority,
            tokenProgram: TOKEN_PROGRAM,
          })
          .rpc();

        console.log('Reward claimed successfully:', claimTx);
        return { success: true, signature: claimTx };
      } catch (error) {
        console.error('Failed to claim reward:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to claim reward:', error);
      throw error;
    }
  }, [connection, wallet, createTokenAccount, initializeUserStats, initializePool, getPoolStats, getPoolAuthority]);

  const donate = useCallback(async (amount: number) => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      // First, ensure the user has a token account
      console.log('Creating or verifying token account...');
      const tokenResult = await createTokenAccount();
      if (!tokenResult.success) {
        console.error('Failed to create token account:', tokenResult.error);
        throw new Error('Failed to create token account');
      }
      
      const provider = new AnchorProvider(
        connection,
        {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions,
        },
        { commitment: 'confirmed' }
      );

      // Use the imported IDL
      const program = new Program(idl, PROGRAM_ID, provider);
      
      // Get the user's USDC token account
      const userTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        wallet.publicKey
      );
      
      // Get the pool token account
      const poolAuthority = getPoolAuthority();
      const poolTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        poolAuthority,
        true // allowOwnerOffCurve
      );
      
      // Convert amount to lamports (USDC has 6 decimals)
      const lamports = new BN(amount * 1000000);
      
      console.log('Donating with accounts:', {
        donor: wallet.publicKey.toString(),
        donorToken: userTokenAccount.toString(),
        poolToken: poolTokenAccount.toString(),
        tokenProgram: TOKEN_PROGRAM.toString(),
        amount: lamports.toString(),
      });

      // Explicitly verify the token account exists and is initialized
      try {
        console.log('Verifying token account is initialized...');
        const tokenAccountInfo = await getAccount(connection, userTokenAccount);
        console.log('Token account verified:', tokenAccountInfo.address.toString());
      } catch (error) {
        console.error('Token account verification failed:', error);
        // Try to create it again with explicit confirmation
        console.log('Attempting to create token account again...');
        await createTokenAccount();
        
        // Verify again
        try {
          await getAccount(connection, userTokenAccount);
          console.log('Token account created and verified successfully');
        } catch (verifyError) {
          console.error('Token account still not initialized after creation attempt:', verifyError);
          throw new Error('Failed to initialize token account');
        }
      }

      try {
        const tx = await program.methods
          .donate(lamports)
          .accounts({
            donor: wallet.publicKey,
            donorToken: userTokenAccount,
            poolToken: poolTokenAccount,
            tokenProgram: TOKEN_PROGRAM,
          })
          .rpc();

        console.log('Donation successful:', tx);
        return { success: true, signature: tx };
      } catch (error) {
        console.error('Failed to donate:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to donate:', error);
      throw error;
    }
  }, [connection, wallet, createTokenAccount]);

  return { claimReward, donate, createTokenAccount, initializeUserStats, initializePool };
};