-- SimuPBX schema. Applied idempotently by `npm run db:migrate` (or make db-migrate).

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin','manager','agent')),
  extension     TEXT UNIQUE NOT NULL,
  sip_password  TEXT NOT NULL,
  presence      TEXT NOT NULL DEFAULT 'offline',
  queues        TEXT[] NOT NULL DEFAULT '{}',
  allow_international BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS numbers (
  id         BIGSERIAL PRIMARY KEY,
  label      TEXT NOT NULL,
  e164       TEXT UNIQUE NOT NULL,
  provider   TEXT NOT NULL DEFAULT 'africastalking',
  inbound_route JSONB NOT NULL DEFAULT '{"type":"ivr","target":"main"}',
  failover_e164 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  company    TEXT,
  phone      TEXT UNIQUE NOT NULL,
  alt_phone  TEXT,
  email      TEXT,
  tags       TEXT[] NOT NULL DEFAULT '{}',
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calls (
  id            BIGSERIAL PRIMARY KEY,
  provider_id   TEXT UNIQUE,             -- AT sessionId / FS uuid
  direction     TEXT NOT NULL CHECK (direction IN ('inbound','outbound','internal')),
  from_e164     TEXT NOT NULL,
  to_e164       TEXT NOT NULL,
  via_number    TEXT,
  contact_id    BIGINT REFERENCES contacts(id),
  agent_id      BIGINT REFERENCES users(id),
  queue         TEXT,
  status        TEXT NOT NULL DEFAULT 'ringing',  -- ringing|answered|missed|voicemail|zuri|failed
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at   TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  duration_sec  INT NOT NULL DEFAULT 0,
  recording_url TEXT,
  cost_kes      NUMERIC(10,2),
  transcript    JSONB,                   -- [{speaker, at, text}]
  summary       JSONB,                   -- {bullets:[], action_items:[], sentiment}
  tags          TEXT[] NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS calls_started_idx ON calls (started_at DESC);

CREATE TABLE IF NOT EXISTS voicemails (
  id          BIGSERIAL PRIMARY KEY,
  call_id     BIGINT REFERENCES calls(id),
  from_e164   TEXT NOT NULL,
  audio_url   TEXT,
  transcript  TEXT,
  urgency     TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('high','normal','low')),
  urgency_reason TEXT,
  listened    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id          BIGSERIAL PRIMARY KEY,
  contact_id  BIGINT REFERENCES contacts(id),
  channel     TEXT NOT NULL CHECK (channel IN ('sms','whatsapp')),
  direction   TEXT NOT NULL CHECK (direction IN ('in','out','auto')),
  e164        TEXT NOT NULL,
  body        TEXT NOT NULL,
  provider_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_contact_idx ON messages (contact_id, created_at);

CREATE TABLE IF NOT EXISTS payments (
  id           BIGSERIAL PRIMARY KEY,
  call_id      BIGINT REFERENCES calls(id),
  contact_id   BIGINT REFERENCES contacts(id),
  phone        TEXT NOT NULL,
  amount_kes   NUMERIC(12,2) NOT NULL,
  mpesa_ref    TEXT,
  checkout_id  TEXT UNIQUE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kb_entries (
  id         BIGSERIAL PRIMARY KEY,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS callbacks (
  id           BIGSERIAL PRIMARY KEY,
  phone        TEXT NOT NULL,
  queue        TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  call_id      BIGINT REFERENCES calls(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
