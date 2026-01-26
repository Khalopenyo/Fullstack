ALTER TABLE presets
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS preset_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS preset_group_items (
  group_id uuid NOT NULL REFERENCES preset_groups(id) ON DELETE CASCADE,
  perfume_id text NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (group_id, perfume_id)
);

CREATE INDEX IF NOT EXISTS preset_groups_preset_idx ON preset_groups (preset_id, position);
CREATE INDEX IF NOT EXISTS preset_group_items_group_idx ON preset_group_items (group_id, position);
