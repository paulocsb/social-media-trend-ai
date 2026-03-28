-- Campaigns: top-level namespace for all collected data
CREATE TABLE campaigns (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  color       TEXT        NOT NULL DEFAULT '#6366f1',
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX campaigns_user_id_idx ON campaigns (user_id);

-- Seed the default campaign so existing data can be migrated
INSERT INTO campaigns (id, user_id, name, description, color)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Default',
  'Default campaign (migrated from initial setup)',
  '#6366f1'
);
