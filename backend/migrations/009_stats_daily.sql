CREATE TABLE IF NOT EXISTS stat_events_daily (
  day date NOT NULL,
  perfume_id text NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'view',
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, perfume_id, type)
);

CREATE INDEX IF NOT EXISTS stat_events_daily_day_idx ON stat_events_daily (day);
