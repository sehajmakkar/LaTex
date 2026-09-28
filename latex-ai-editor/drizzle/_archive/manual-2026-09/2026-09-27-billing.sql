-- Billing hardening: billing period, cancellation and event ordering on users; processed webhook ids.
-- Additive only; safe to run more than once.
-- (The DB is managed with drizzle-kit push today; fold this into the Phase 2 baseline migration.)

ALTER TABLE users ADD COLUMN IF NOT EXISTS current_period_end timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_event_at timestamp;

CREATE TABLE IF NOT EXISTS processed_webhooks (
  webhook_id text PRIMARY KEY,
  event_type text NOT NULL,
  outcome text NOT NULL,
  received_at timestamp NOT NULL DEFAULT now()
);

-- 28 Sep: trace which account and subscription each webhook touched.
ALTER TABLE processed_webhooks ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE processed_webhooks ADD COLUMN IF NOT EXISTS subscription_id text;
