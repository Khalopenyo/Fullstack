-- Default presets with groups (safe to re-run).

WITH presets_data AS (
  SELECT 1 AS position, 'Лето'::text AS title, 'Легкость и прохлада'::text AS subtitle, 'Свежие и чистые направления'::text AS notes
  UNION ALL SELECT 2, 'Осень', 'Теплые и уютные', 'Древесные и амбровые акценты'
  UNION ALL SELECT 3, 'Зима', 'Глубокие и пряные', 'Смолы, специи, гурманика'
  UNION ALL SELECT 4, 'Весна', 'Нежные и воздушные', 'Цветы, зелень, пудра'
)
INSERT INTO presets (id, title, subtitle, notes, position, created_at, updated_at)
SELECT gen_random_uuid(), d.title, d.subtitle, d.notes, d.position, now(), now()
FROM presets_data d
WHERE NOT EXISTS (
  SELECT 1 FROM presets p WHERE lower(p.title) = lower(d.title)
);

-- Лето
WITH preset_row AS (
  SELECT id FROM presets WHERE lower(title) = lower('Лето') LIMIT 1
),
groups_data AS (
  SELECT 1 AS position, 'Свежий цитрус'::text AS title, 'Бодрый, прохладный'::text AS subtitle, 'Бергамот • лимон • нероли'::text AS notes
  UNION ALL SELECT 2, 'Морская свежесть', 'Чистый и прозрачный', 'Озон • морская соль • мускус'
  UNION ALL SELECT 3, 'Фруктовый лёд', 'Легкий и яркий', 'Грейпфрут • яблоко • мята'
)
INSERT INTO preset_groups (preset_id, title, subtitle, notes, position, created_at, updated_at)
SELECT preset_row.id, g.title, g.subtitle, g.notes, g.position, now(), now()
FROM preset_row, groups_data g
WHERE NOT EXISTS (
  SELECT 1 FROM preset_groups pg
  WHERE pg.preset_id = preset_row.id AND lower(pg.title) = lower(g.title)
);

-- Осень
WITH preset_row AS (
  SELECT id FROM presets WHERE lower(title) = lower('Осень') LIMIT 1
),
groups_data AS (
  SELECT 1 AS position, 'Древесность'::text AS title, 'Спокойный и теплый'::text AS subtitle, 'Кедр • сандал • ветивер'::text AS notes
  UNION ALL SELECT 2, 'Тёплая амбра', 'Мягкий шлейф', 'Амбра • ваниль • бензоин'
  UNION ALL SELECT 3, 'Пряный чай', 'Уютный вечер', 'Чай • корица • кардамон'
)
INSERT INTO preset_groups (preset_id, title, subtitle, notes, position, created_at, updated_at)
SELECT preset_row.id, g.title, g.subtitle, g.notes, g.position, now(), now()
FROM preset_row, groups_data g
WHERE NOT EXISTS (
  SELECT 1 FROM preset_groups pg
  WHERE pg.preset_id = preset_row.id AND lower(pg.title) = lower(g.title)
);

-- Зима
WITH preset_row AS (
  SELECT id FROM presets WHERE lower(title) = lower('Зима') LIMIT 1
),
groups_data AS (
  SELECT 1 AS position, 'Пряный вечер'::text AS title, 'Глубокий и насыщенный'::text AS subtitle, 'Гвоздика • перец • корица'::text AS notes
  UNION ALL SELECT 2, 'Смолы и ваниль', 'Теплый и плотный', 'Ладан • ваниль • смолы'
  UNION ALL SELECT 3, 'Гурманика', 'Сладкий уют', 'Карамель • какао • тонка'
)
INSERT INTO preset_groups (preset_id, title, subtitle, notes, position, created_at, updated_at)
SELECT preset_row.id, g.title, g.subtitle, g.notes, g.position, now(), now()
FROM preset_row, groups_data g
WHERE NOT EXISTS (
  SELECT 1 FROM preset_groups pg
  WHERE pg.preset_id = preset_row.id AND lower(pg.title) = lower(g.title)
);

-- Весна
WITH preset_row AS (
  SELECT id FROM presets WHERE lower(title) = lower('Весна') LIMIT 1
),
groups_data AS (
  SELECT 1 AS position, 'Цветочная нежность'::text AS title, 'Мягкий и романтичный'::text AS subtitle, 'Пион • роза • жасмин'::text AS notes
  UNION ALL SELECT 2, 'Зелёная свежесть', 'Чистый воздух', 'Зелень • лист чая • ландыш'
  UNION ALL SELECT 3, 'Пудровый мускус', 'Нежный шлейф', 'Мускус • ирис • фиалка'
)
INSERT INTO preset_groups (preset_id, title, subtitle, notes, position, created_at, updated_at)
SELECT preset_row.id, g.title, g.subtitle, g.notes, g.position, now(), now()
FROM preset_row, groups_data g
WHERE NOT EXISTS (
  SELECT 1 FROM preset_groups pg
  WHERE pg.preset_id = preset_row.id AND lower(pg.title) = lower(g.title)
);
