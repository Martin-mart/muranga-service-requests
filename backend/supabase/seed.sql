-- =============================================================================
-- Reference data seed. Idempotent: safe to run on every deploy and on
-- `supabase db reset` (local). Upserts by slug so renames propagate and
-- re-running never duplicates rows.
-- =============================================================================

insert into public.sub_counties (slug, name) values
  ('kiharu',         'Kiharu'),
  ('kigumo',         'Kigumo'),
  ('kangema',        'Kangema'),
  ('mathioya',       'Mathioya'),
  ('kahuro',         'Kahuro'),
  ('muranga-south',  'Murang''a South'),
  ('gatanga',        'Gatanga'),
  ('kandara',        'Kandara'),
  ('maragua',        'Maragua')
on conflict (slug) do update set name = excluded.name, is_active = true;

insert into public.categories (slug, name, description, sort_order) values
  ('streetlight',     'Broken streetlight',     'Street or security lights that are off, flickering or damaged.', 10),
  ('water-supply',    'Water supply',           'No water, low pressure, burst pipes or leaking meters.',         20),
  ('garbage',         'Garbage collection',     'Missed collection, overflowing skips or illegal dumping.',       30),
  ('roads',           'Roads and potholes',     'Potholes, damaged culverts or impassable county roads.',         40),
  ('drainage',        'Drainage and sewerage',  'Blocked drains, flooding or sewer overflows.',                   50),
  ('public-health',   'Public health',          'Sanitation hazards, stagnant water or unsafe food premises.',    60),
  ('markets',         'Market facilities',      'Damaged stalls, sheds, toilets or lighting in county markets.',  70),
  ('other',           'Other',                  'Any other county service issue.',                                99)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      sort_order = excluded.sort_order,
      is_active = true;
