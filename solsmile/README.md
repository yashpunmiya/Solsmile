# SolSmile ✨

## About the Project

SolSmile is a Web3 application on Solana Devnet that rewards genuine smiles with USDC. The flow:

1. User uploads a selfie 📸
2. AI (Gemini) analyzes the smile score
3. If the score ≥ 5 → the user can claim 0.01 USDC from a public reward pool
4. Community members can donate USDC to this pool, funding future smiles

## Smart Contract Overview

Built using Anchor framework with Token Program for USDC transfers.

### Program Functions

- **initialize_pool** → Creates a stats account to track total rewards & claims and initializes the pool PDA.
- **claim_reward** → If a user's last claim wasn't today, transfers 0.01 USDC (10000 in 6 decimals) from pool to the user's token account.
- **donate** → Allows anyone to transfer USDC from their token account to the pool token account.

# SolSmile ✨
## Important Addresses

| Purpose | Address |
| ------- | ------- |
| Program ID | `FQn8MWGWrtSsittvBV8qfJhKRhaqZA68JSUAc8hJrtPZ` |
| USDC Mint Address | `Dk4r51T9fVg5UVq2rT5FC9KA7oGAyiahAQUEjS7QDAt1` |
| Pool PDA | `SWqn1i9kJK3yiEanzpG9SGq4m4X3vp3ZwTWtGYKq8YN` |
| Pool Token Account | `8hZyHTQLYoPh6ugqw7K2E6uKp2v19zy71t8EngH8c89o` |

## Environment Setup

1. Copy `.env.example` to `.env.local`
2. Update the values in `.env.local` with your credentials:
   - `NEXT_PUBLIC_GEMINI_API_KEY`: Your Google Gemini API key
   - `NEXT_PUBLIC_SOLANA_NETWORK`: Solana network to use (devnet, testnet, or mainnet-beta)
   - Other contract addresses can be left as default for development

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- Upload selfies and get them analyzed by Gemini AI
- Connect your Solana wallet (Phantom, Solflare)
- Claim USDC rewards for genuine smiles
- Donate USDC to the community pool
- View your USDC balance and the pool balance
- Gallery of verified smiles

## Technologies Used

- Next.js for the frontend
- Solana Web3.js and Wallet Adapter for blockchain integration
- Anchor framework for smart contract interaction
- Supabase for image storage
- Gemini API for smile analysis
- Tailwind CSS for styling
