CREATE TABLE research_queue (
 facility_id TEXT PRIMARY KEY REFERENCES facilities(id),
 batch INTEGER NOT NULL CHECK(batch BETWEEN 1 AND 10),
 priority INTEGER NOT NULL UNIQUE,
 country_code TEXT,
 operator_group TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in-progress','reviewed')),
 review_note TEXT,
 reviewed_at TEXT
) STRICT;
CREATE TABLE research_profiles (
 facility_id TEXT PRIMARY KEY REFERENCES facilities(id),
 profile TEXT NOT NULL CHECK(json_valid(profile)),
 updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE research_sources (
 facility_id TEXT NOT NULL REFERENCES facilities(id),
 source_id TEXT NOT NULL,
 url TEXT NOT NULL,
 title TEXT NOT NULL,
 accessed_at TEXT NOT NULL,
 published_at TEXT,
 PRIMARY KEY(facility_id,source_id)
) STRICT;
CREATE TABLE research_facts (
 facility_id TEXT NOT NULL REFERENCES facilities(id),
 fact_id TEXT NOT NULL,
 fact TEXT NOT NULL CHECK(json_valid(fact)),
 PRIMARY KEY(facility_id,fact_id)
) STRICT;
CREATE INDEX research_queue_batch_status ON research_queue(batch,status);
