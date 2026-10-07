import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const defaultPath = fileURLToPath(
  new URL("../data/todo.db", import.meta.url),
);
export function openDatabase(path = defaultPath, { seed = false } = {}) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON");
  // Upgrade the original one-table database without deleting existing tasks.
  const columns = db.prepare("PRAGMA table_info(tasks)").all();
  if (
    columns.length &&
    !columns.some((column) => column.name === "project_id")
  ) {
    db.exec(
      "ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL",
    );
  }
  const hasSchema = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='task_tags'",
    )
    .get();
  if (!hasSchema || seed) {
    db.exec(
      readFileSync(new URL("../sql/import.sql", import.meta.url), "utf8"),
    );
  }
  return db;
}

export function taskStore(db) {
  return {
    list: () => db.prepare("SELECT * FROM tasks ORDER BY id DESC").all(),
    get: (id) => db.prepare("SELECT * FROM tasks WHERE id = ?").get(id),
    create(title) {
      const result = db
        .prepare("INSERT INTO tasks (title) VALUES (?)")
        .run(title);
      return this.get(Number(result.lastInsertRowid));
    },
    update(id, completed) {
      db.prepare("UPDATE tasks SET completed = ? WHERE id = ?").run(
        completed ? 1 : 0,
        id,
      );
      return this.get(id);
    },
    remove: (id) =>
      db.prepare("DELETE FROM tasks WHERE id = ?").run(id).changes > 0,
  };
}
