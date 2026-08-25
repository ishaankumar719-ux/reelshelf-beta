-- Creates the multi-use TestFlight beta invite code using the EXISTING
-- beta_invites architecture (max_uses/current_uses/is_active/expires_at,
-- validated by validate_beta_invite() and atomically redeemed by
-- claim_beta_invite() via `SELECT ... FOR UPDATE` row-locking -- already
-- concurrency-safe, already supports max_uses > 1, confirmed by real existing
-- multi-use rows e.g. REEL-H3EZ-LNQG (max_uses=11). No schema change, no new
-- RPC, no new table -- this is purely a data seed.
--
-- ON CONFLICT is idempotent-safe if this migration is ever re-applied: it
-- re-asserts max_uses/is_active/expires_at but deliberately never touches
-- current_uses, so a re-run can never reset real redemption counts.
insert into public.beta_invites (code, max_uses, current_uses, is_active, expires_at)
values ('REELSHELF-BETA', 20, 0, true, null)
on conflict (code) do update
set max_uses = excluded.max_uses,
    is_active = excluded.is_active,
    expires_at = excluded.expires_at;
