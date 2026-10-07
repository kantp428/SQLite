import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { openDatabase } from "./db.js";
const resources = {
  users: ["name", "email"],
  projects: ["name", "owner_id"],
  tasks: ["title", "completed", "project_id"],
  comments: ["task_id", "author_id", "body"],
  tags: ["name"],
};
const fail = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};
export function createApp(db) {
  const get = (table, id) =>
    db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);
  return createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(body));
    };
    try {
      const path = new URL(req.url, "http://localhost").pathname;
      if (
        req.method === "GET" &&
        ["/", "/app.js", "/style.css"].includes(path)
      ) {
        const file = path === "/" ? "index.html" : path.slice(1);
        res.writeHead(200, {
          "Content-Type":
            {
              "index.html": "text/html",
              "app.js": "text/javascript",
              "style.css": "text/css",
            }[file] + "; charset=utf-8",
        });
        return res.end(
          readFileSync(new URL("../public/" + file, import.meta.url)),
        );
      }
      if (path === "/api/task-tags" && req.method === "GET")
        return send(
          200,
          db.prepare("SELECT * FROM task_tags ORDER BY task_id,tag_id").all(),
        );
      const match = path.match(
        /^\/api\/(users|projects|tasks|comments|tags)(?:\/([1-9]\d*))?(\/tags)?$/,
      );
      if (!match) fail(404, "ไม่พบเส้นทาง");
      const [, table, rawId, suffix] = match;
      const id = rawId ? Number(rawId) : null;
      if (id !== null && !Number.isSafeInteger(id)) fail(400, "ID ไม่ถูกต้อง");
      if (suffix && (table !== "tasks" || !id || req.method !== "PUT"))
        fail(404, "ไม่พบเส้นทาง");
      if (req.method === "GET" && !suffix) {
        if (id) {
          const row = get(table, id);
          if (!row) fail(404, "ไม่พบข้อมูล");
          return send(200, row);
        }
        let rows;
        if (table === "tasks")
          rows = db
            .prepare(
              "SELECT t.*,p.name AS project_name FROM tasks t LEFT JOIN projects p ON p.id=t.project_id ORDER BY t.id DESC",
            )
            .all()
            .map((t) => ({
              ...t,
              tags: db
                .prepare(
                  "SELECT g.* FROM tags g JOIN task_tags tt ON tt.tag_id=g.id WHERE tt.task_id=?",
                )
                .all(t.id),
            }));
        else if (table === "projects")
          rows = db
            .prepare(
              "SELECT p.*,u.name AS owner_name FROM projects p LEFT JOIN users u ON u.id=p.owner_id ORDER BY p.id DESC",
            )
            .all();
        else if (table === "comments")
          rows = db
            .prepare(
              "SELECT c.*,u.name AS author_name FROM comments c LEFT JOIN users u ON u.id=c.author_id ORDER BY c.id",
            )
            .all();
        else rows = db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all();
        return send(200, rows);
      }
      if (req.method === "DELETE" && id && !suffix) {
        if (!db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id).changes)
          fail(404, "ไม่พบข้อมูล");
        return send(200, { message: "ลบแล้ว" });
      }
      if (!(
        (req.method === "POST" && !id) ||
        (req.method === "PATCH" && id && !suffix) ||
        (req.method === "PUT" && suffix)
      ))
        fail(405, "Method ไม่รองรับ");
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 20000) fail(413, "ข้อมูลใหญ่เกินไป");
        chunks.push(chunk);
      }
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        fail(400, "JSON ไม่ถูกต้อง");
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        fail(400, "ต้องส่ง JSON object");
      if (id && !get(table, id)) fail(404, "ไม่พบข้อมูล");
      if (suffix) {
        if (
          Object.keys(body).some((k) => k !== "tag_ids") ||
          !Array.isArray(body.tag_ids) ||
          body.tag_ids.length > 100 ||
          body.tag_ids.some(
            (v) => !Number.isSafeInteger(v) || v < 1 || !get("tags", v),
          )
        )
          fail(400, "tag_ids ต้องเป็นรหัสแท็กที่มีอยู่ ไม่เกิน 100 รายการ");
        db.exec("BEGIN");
        try {
          db.prepare("DELETE FROM task_tags WHERE task_id=?").run(id);
          for (const tag of new Set(body.tag_ids))
            db.prepare(
              "INSERT INTO task_tags(task_id,tag_id) VALUES (?,?)",
            ).run(id, tag);
          db.exec("COMMIT");
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
        return send(200, { message: "บันทึกแท็กแล้ว" });
      }
      const allowed = resources[table];
      if (Object.keys(body).some((k) => !allowed.includes(k)))
        fail(400, "มีฟิลด์ที่ไม่รองรับ");
      const values = {};
      for (const key of allowed) {
        if (!(key in body)) {
          if (
            req.method === "POST" &&
            ["name", "email", "title", "task_id", "body"].includes(key)
          )
            fail(400, "ต้องระบุ " + key);
          continue;
        }
        let value = body[key];
        if (key === "completed") {
          if (typeof value !== "boolean")
            fail(400, "completed ต้องเป็น boolean");
          value = value ? 1 : 0;
        } else if (key.endsWith("_id")) {
          if (value === null && key !== "task_id") {
            values[key] = null;
            continue;
          }
          const parent = {
            owner_id: "users",
            author_id: "users",
            project_id: "projects",
            task_id: "tasks",
          }[key];
          if (!Number.isSafeInteger(value) || value < 1 || !get(parent, value))
            fail(400, "ข้อมูลอ้างอิงไม่ถูกต้อง: " + key);
        } else {
          const max = key === "body" ? 2000 : 200;
          if (
            typeof value !== "string" ||
            !value.trim() ||
            value.trim().length > max
          )
            fail(400, `${key} ต้องมี 1–${max} ตัวอักษร`);
          value = value.trim();
          if (key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
            fail(400, "email ไม่ถูกต้อง");
        }
        values[key] = value;
      }
      const keys = Object.keys(values);
      if (!keys.length) fail(400, "ต้องระบุข้อมูล");
      if (req.method === "POST") {
        const result = db
          .prepare(
            `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
          )
          .run(...Object.values(values));
        return send(201, get(table, Number(result.lastInsertRowid)));
      }
      db.prepare(
        `UPDATE ${table} SET ${keys.map((k) => k + "=?").join(",")} WHERE id=?`,
      ).run(...Object.values(values), id);
      send(200, get(table, id));
    } catch (error) {
      if (error.status) return send(error.status, { error: error.message });
      if (
        error.code?.startsWith("ERR_SQLITE") &&
        /constraint/i.test(error.message)
      )
        return send(409, { error: "ข้อมูลซ้ำหรือขัดกับเงื่อนไขฐานข้อมูล" });
      console.error(error);
      send(500, { error: "เกิดข้อผิดพลาดภายในระบบ" });
    }
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const db = openDatabase();
  const server = createApp(db);
  server.listen(Number(process.env.PORT || 3000), "127.0.0.1", () =>
    console.log("เปิด http://localhost:" + (process.env.PORT || 3000)),
  );
  const stop = () =>
    server.close(() => {
      db.close();
      process.exit(0);
    });
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
