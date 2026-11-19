PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA user_version = 1;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL CHECK (length(username) BETWEEN 3 AND 20),
  username_key TEXT NOT NULL UNIQUE,
  email TEXT CHECK (email IS NULL OR length(email) <= 254),
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'mentor')),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS mentor_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline TEXT NOT NULL CHECK (length(headline) BETWEEN 8 AND 120),
  university TEXT NOT NULL CHECK (length(university) BETWEEN 2 AND 100),
  department TEXT NOT NULL CHECK (length(department) BETWEEN 2 AND 100),
  exam TEXT NOT NULL CHECK (exam IN ('ys', 'yks', 'lgs')),
  score TEXT NOT NULL CHECK (length(score) BETWEEN 2 AND 80),
  subjects TEXT NOT NULL,
  price_try INTEGER NOT NULL CHECK (price_try BETWEEN 100 AND 5000),
  bio TEXT NOT NULL DEFAULT '' CHECK (length(bio) <= 1200),
  avatar_color TEXT NOT NULL CHECK (length(avatar_color) = 7)
);

CREATE INDEX IF NOT EXISTS idx_mentor_profiles_exam_price
  ON mentor_profiles(exam, price_try);

CREATE TABLE IF NOT EXISTS availability_slots (
  id TEXT PRIMARY KEY,
  mentor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at INTEGER NOT NULL,
  duration_min INTEGER NOT NULL CHECK (duration_min BETWEEN 20 AND 180),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'booked')),
  UNIQUE (mentor_id, starts_at)
);

CREATE INDEX IF NOT EXISTS idx_slots_mentor_status_start
  ON availability_slots(mentor_id, status, starts_at);
CREATE INDEX IF NOT EXISTS idx_slots_status_start
  ON availability_slots(status, starts_at);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL REFERENCES availability_slots(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 10 AND 600),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_student_status
  ON bookings(student_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_mentor_status
  ON bookings(mentor_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_status
  ON bookings(slot_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_active_student_slot
  ON bookings(slot_id, student_id)
  WHERE status IN ('pending', 'accepted');
