CREATE TABLE facilities (
  id TEXT PRIMARY KEY,
  source_key TEXT NOT NULL,
  source_id TEXT NOT NULL,
  is_demo INTEGER NOT NULL CHECK(is_demo IN (0,1)),
  country_code TEXT,
  city TEXT,
  operator TEXT,
  status TEXT CHECK(status IS NULL OR status IN ('planned','under-construction','operational','closed')),
  search_text TEXT NOT NULL,
  identity_key TEXT NOT NULL,
  latitude REAL CHECK(latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude REAL CHECK(longitude IS NULL OR longitude BETWEEN -180 AND 180),
  record TEXT NOT NULL CHECK(json_valid(record)),
  UNIQUE(source_key, source_id)
) STRICT;
CREATE INDEX facilities_country_city ON facilities(is_demo, country_code, city);
CREATE INDEX facilities_operator ON facilities(is_demo, operator);
CREATE INDEX facilities_status ON facilities(is_demo, status);
CREATE INDEX facilities_identity ON facilities(identity_key);
