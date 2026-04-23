use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod seeker_stats {
    use super::*;

    /// Initialize a new player stats account
    pub fn initialize_player(ctx: Context<InitializePlayer>) -> Result<()> {
        let player_stats = &mut ctx.accounts.player_stats;
        player_stats.player = ctx.accounts.player.key();
        player_stats.total_distance = 0;
        player_stats.total_skr_earned = 0;
        player_stats.total_runs = 0;
        player_stats.best_distance = 0;
        player_stats.created_at = Clock::get()?.unix_timestamp;

        emit!(PlayerInitialized {
            player: ctx.accounts.player.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Record a completed run with score and SKR earned
    pub fn record_run(
        ctx: Context<RecordRun>,
        distance: u64,
        skr_earned: u64,
    ) -> Result<()> {
        let player_stats = &mut ctx.accounts.player_stats;

        // Update stats
        player_stats.total_distance = player_stats
            .total_distance
            .checked_add(distance)
            .ok_or(SeekerError::Overflow)?;
        player_stats.total_skr_earned = player_stats
            .total_skr_earned
            .checked_add(skr_earned)
            .ok_or(SeekerError::Overflow)?;
        player_stats.total_runs = player_stats
            .total_runs
            .checked_add(1)
            .ok_or(SeekerError::Overflow)?;

        if distance > player_stats.best_distance {
            player_stats.best_distance = distance;
        }

        player_stats.last_run_timestamp = Clock::get()?.unix_timestamp;

        emit!(RunRecorded {
            player: ctx.accounts.player.key(),
            distance,
            skr_earned,
            total_runs: player_stats.total_runs,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePlayer<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        init,
        payer = player,
        space = 8 + PlayerStats::INIT_SPACE,
        seeds = [b"player_stats", player.key().as_ref()],
        bump
    )]
    pub player_stats: Account<'info, PlayerStats>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordRun<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player_stats", player.key().as_ref()],
        bump
    )]
    pub player_stats: Account<'info, PlayerStats>,
}

#[account]
pub struct PlayerStats {
    pub player: Pubkey,
    pub total_distance: u64,
    pub total_skr_earned: u64,
    pub total_runs: u64,
    pub best_distance: u64,
    pub created_at: i64,
    pub last_run_timestamp: i64,
}

impl PlayerStats {
    const INIT_SPACE: usize = 32 + 8 + 8 + 8 + 8 + 8 + 8;
}

#[error_code]
pub enum SeekerError {
    #[msg("Arithmetic overflow")]
    Overflow,
}

#[event]
pub struct PlayerInitialized {
    pub player: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RunRecorded {
    pub player: Pubkey,
    pub distance: u64,
    pub skr_earned: u64,
    pub total_runs: u64,
    pub timestamp: i64,
}
