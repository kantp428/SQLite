import { openDatabase } from "../src/db.js";
const db = openDatabase();
try {
  console.log("ตารางในฐานข้อมูล (ไม่รวมตารางภายใน SQLite)");
  console.table(
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all(),
  );
  console.log("เจ้าของโปรเจกต์");
  console.table(
    db
      .prepare(
        "SELECT p.name AS project, u.name AS owner FROM projects p LEFT JOIN users u ON u.id = p.owner_id",
      )
      .all(),
  );
  console.log("ความคิดเห็นและผู้เขียน");
  console.table(
    db
      .prepare(
        "SELECT t.title, u.name AS author, c.body FROM comments c JOIN tasks t ON t.id = c.task_id LEFT JOIN users u ON u.id = c.author_id",
      )
      .all(),
  );
  console.log("แท็กของแต่ละงาน (many-to-many)");
  console.table(
    db
      .prepare(
        "SELECT t.title, g.name AS tag FROM tasks t JOIN task_tags tt ON tt.task_id = t.id JOIN tags g ON g.id = tt.tag_id",
      )
      .all(),
  );
} finally {
  db.close();
}
