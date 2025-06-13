import { PublicKey } from '@solana/web3.js';
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// Use environment variables for contract addresses or fall back to hardcoded values
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || 'FQn8MWGWrtSsittvBV8qfJhKRhaqZA68JSUAc8hJrtPZ'
);
export const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT || 'Dk4r51T9fVg5UVq2rT5FC9KA7oGAyiahAQUEjS7QDAt1'
);
export const RECIPIENT_TOKEN_ACCOUNT = new PublicKey(
  process.env.NEXT_PUBLIC_RECIPIENT_TOKEN_ACCOUNT || '8hZyHTQLYoPh6ugqw7K2E6uKp2v19zy71t8EngH8c89o'
);
export const POOL_PDA = new PublicKey(
  process.env.NEXT_PUBLIC_POOL_PDA || 'SWqn1i9kJK3yiEanzpG9SGq4m4X3vp3ZwTWtGYKq8YN'
);

// PDAs
export const getPoolAuthority = () => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    PROGRAM_ID
  )[0];
};

export const getUserStats = (userPubkey: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_stats"), userPubkey.toBuffer()],
    PROGRAM_ID
  )[0];
};

export const TOKEN_PROGRAM = TOKEN_PROGRAM_ID;