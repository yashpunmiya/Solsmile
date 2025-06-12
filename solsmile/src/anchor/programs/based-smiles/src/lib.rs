use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

declare_id!("FQn8MWGWrtSsittvBV8qfJhKRhaqZA68JSUAc8hJrtPZ");

#[program]
pub mod based_smiles {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        _bump: u8,
    ) -> Result<()> {
        ctx.accounts.pool_stats.authority = ctx.accounts.authority.key();
        ctx.accounts.pool_stats.total_rewards = 0;
        ctx.accounts.pool_stats.total_claims = 0;
        Ok(())
    }

    pub fn initialize_user_stats(
        ctx: Context<InitializeUserStats>,
        _bump: u8,
    ) -> Result<()> {
        // Initialize user stats with default values
        ctx.accounts.user_stats.last_claim_day = 0; // Initialize with 0 (never claimed)
        ctx.accounts.user_stats.total_claims = 0;   // Initialize with 0 claims
        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        // Verify daily claim limit
        let clock = Clock::get()?;
        let today = clock.unix_timestamp / 86400;

        if ctx.accounts.user_stats.last_claim_day == today {
            return err!(ErrorCode::DailyLimitReached);
        }

        // Verify pool has enough balance
        let pool_balance = ctx.accounts.pool_token.amount;
        if pool_balance < 10000 {
            return err!(ErrorCode::InsufficientPoolBalance);
        }

        // Transfer 0.01 USDC (6 decimals)
        let transfer_ix = token::Transfer {
            from: ctx.accounts.pool_token.to_account_info(),
            to: ctx.accounts.user_token.to_account_info(),
            authority: ctx.accounts.pool_authority.to_account_info(),
        };

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_ix,
                &[&[
                    b"pool".as_ref(),
                    &[ctx.bumps.pool_authority],
                ]],
            ),
            10000,
        )?;

        // Update stats
        ctx.accounts.user_stats.last_claim_day = today;
        ctx.accounts.user_stats.total_claims += 1;
        ctx.accounts.pool_stats.total_claims += 1;
        ctx.accounts.pool_stats.total_rewards += 10000;

        Ok(())
    }

    pub fn donate(
        ctx: Context<Donate>,
        amount: u64,
    ) -> Result<()> {
        // Transfer USDC from donor to pool
        let transfer_ix = token::Transfer {
            from: ctx.accounts.donor_token.to_account_info(),
            to: ctx.accounts.pool_token.to_account_info(),
            authority: ctx.accounts.donor.to_account_info(),
        };

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                transfer_ix,
            ),
            amount,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + PoolStats::LEN
    )]
    pub pool_stats: Account<'info, PoolStats>,

    #[account(
        seeds = [b"pool"],
        bump,
    )]
    /// CHECK: PDA used as pool authority
    pub pool_authority: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializeUserStats<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = 8 + UserStats::LEN,
        seeds = [b"user_stats", user.key().as_ref()],
        bump,
    )]
    pub user_stats: Account<'info, UserStats>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user_stats", user.key().as_ref()],
        bump,
    )]
    pub user_stats: Account<'info, UserStats>,

    #[account(mut)]
    pub pool_stats: Account<'info, PoolStats>,

    #[account(
        mut,
        constraint = pool_token.mint == user_token.mint
    )]
    pub pool_token: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_token.owner == user.key()
    )]
    pub user_token: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"pool"],
        bump,
    )]
    /// CHECK: PDA used as pool authority
    pub pool_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Donate<'info> {
    pub donor: Signer<'info>,

    #[account(
        mut,
        constraint = donor_token.owner == donor.key()
    )]
    pub donor_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub pool_token: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct PoolStats {
    pub authority: Pubkey,
    pub total_rewards: u64,
    pub total_claims: u64,
}

impl PoolStats {
    pub const LEN: usize = 32 + 8 + 8;
}

#[account]
pub struct UserStats {
    pub last_claim_day: i64,
    pub total_claims: u64,
}

impl UserStats {
    pub const LEN: usize = 8 + 8;
}

#[error_code]
pub enum ErrorCode {
    #[msg("You have already claimed your reward today")]
    DailyLimitReached,
    #[msg("Insufficient balance in reward pool")]
    InsufficientPoolBalance,
}