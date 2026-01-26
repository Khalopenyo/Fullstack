CREATE TABLE IF NOT EXISTS presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS preset_items (
  preset_id uuid NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  perfume_id text NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (preset_id, perfume_id)
);

CREATE INDEX IF NOT EXISTS preset_items_preset_idx ON preset_items (preset_id, position);
