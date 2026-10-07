-- Import repeatedly without deleting user data or duplicating seed rows.
PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS task_tags (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);
INSERT OR IGNORE INTO users (id, name, email) VALUES
  (1, 'มิน', 'min@example.com'), (2, 'นัท', 'nat@example.com'),
  (3, 'แพรว', 'praew@example.com');
INSERT OR IGNORE INTO projects (id, name, owner_id) VALUES
  (1, 'เรียนรู้ SQLite', 1), (2, 'เตรียมนำเสนอ', 2);
INSERT OR IGNORE INTO tasks (id, title, completed) VALUES
  (1, 'เรียนรู้คำสั่ง SELECT', 1),
  (2, 'เชื่อมต่อ SQLite กับ Node.js', 0),
  (3, 'ทดลองเพิ่ม แก้ไข และลบงาน', 0);
INSERT OR IGNORE INTO comments (id, task_id, author_id, body) VALUES
  (1, 1, 1, 'ทดลอง WHERE และ ORDER BY แล้ว'),
  (2, 2, 2, 'ใช้ prepared statement เพื่อผูกค่าข้อมูล'),
  (3, 3, 3, 'เตรียมสาธิตผ่านหน้าเว็บ');
INSERT OR IGNORE INTO tags (id, name) VALUES
  (1, 'SQL'), (2, 'Node.js'), (3, 'Demo');
INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES
  (1, 1), (2, 1), (2, 2), (3, 3);
COMMIT;
