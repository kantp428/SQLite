import { test } from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../src/db.js";
test("six tables enforce foreign keys and cascade deletion", () => {
  const db = openDatabase(":memory:");
  try {
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        )
        .get().n,
      6,
    );
    assert.throws(() =>
      db
        .prepare("INSERT INTO comments(task_id, body) VALUES (?, ?)")
        .run(9999, "invalid"),
    );
    assert.throws(() =>
      db.prepare("INSERT INTO task_tags(task_id, tag_id) VALUES (1, 1)").run(),
    );
    db.prepare("DELETE FROM tasks WHERE id = 1").run();
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM comments WHERE task_id = 1").get()
        .n,
      0,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM task_tags WHERE task_id = 1").get()
        .n,
      0,
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    db.close();
  }
});
