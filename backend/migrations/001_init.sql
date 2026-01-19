CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE,
  password_hash text,
  display_name text,
  is_admin boolean NOT NULL DEFAULT false,
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS perfumes (
  id text PRIMARY KEY,
  catalog_mode text NOT NULL DEFAULT 'retail',
  brand text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  family text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  notes_top text[] NOT NULL DEFAULT ARRAY[]::text[],
  notes_heart text[] NOT NULL DEFAULT ARRAY[]::text[],
  notes_base text[] NOT NULL DEFAULT ARRAY[]::text[],
  seasons text[] NOT NULL DEFAULT ARRAY[]::text[],
  day_night text[] NOT NULL DEFAULT ARRAY[]::text[],
  base_price numeric NOT NULL DEFAULT 0,
  base_volume integer NOT NULL DEFAULT 50,
  sillage integer NOT NULL DEFAULT 3,
  longevity integer NOT NULL DEFAULT 3,
  image_url text NOT NULL DEFAULT '',
  search_name_ru text NOT NULL DEFAULT '',
  is_hit boolean NOT NULL DEFAULT false,
  order_count integer NOT NULL DEFAULT 0,
  in_stock boolean NOT NULL DEFAULT true,
  currency text NOT NULL DEFAULT '₽',
  popularity integer NOT NULL DEFAULT 0,
  popularity_month integer NOT NULL DEFAULT 0,
  popularity_month_key text NOT NULL DEFAULT '',
  review_avg numeric NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS perfumes_catalog_mode_idx ON perfumes (catalog_mode);

CREATE TABLE IF NOT EXISTS carts (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  perfume_id text NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, perfume_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_anonymous boolean NOT NULL DEFAULT false,
  email text NOT NULL DEFAULT '',
  display_name text NOT NULL DEFAULT '',
  items jsonb NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT '₽',
  channel text NOT NULL DEFAULT '',
  delivery_method text NOT NULL DEFAULT 'pickup',
  delivery_address text NOT NULL DEFAULT '',
  fulfilled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  perfume_id text NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_label text NOT NULL DEFAULT '',
  rating integer NOT NULL DEFAULT 0,
  text text NOT NULL DEFAULT '',
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (perfume_id, user_id)
);

CREATE TABLE IF NOT EXISTS stat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfume_id text NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now()
);
