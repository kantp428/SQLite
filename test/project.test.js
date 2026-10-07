import { test } from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../src/db.js";
import { createApp } from "../src/server.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("complete project workflow, validation and deletion relationships", async () => {
  const db = openDatabase(":memory:");
  const server = createApp(db);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/`;
  async function request(path, method = "GET", body, status = 200) {
    const response = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    assert.equal(response.status, status, JSON.stringify(result));
    return result;
  }
  try {
    const user = await request(
      "users",
      "POST",
      { name: "Tester", email: "tester@example.com" },
      201,
    );
    await request(
      "users",
      "POST",
      { name: "Duplicate", email: user.email },
      409,
    );
    const project = await request(
      "projects",
      "POST",
      { name: "Project", owner_id: user.id },
      201,
    );
    const task = await request(
      "tasks",
      "POST",
      { title: "Task", project_id: project.id },
      201,
    );
    const tag = await request("tags", "POST", { name: "New tag" }, 201);
    const comment = await request(
      "comments",
      "POST",
      { task_id: task.id, author_id: user.id, body: "ความคิดเห็น" },
      201,
    );
    await request(`tasks/${task.id}/tags`, "PUT", {
      tag_ids: [tag.id, tag.id],
    });
    assert.equal(
      (await request("task-tags")).filter((t) => t.task_id === task.id).length,
      1,
    );
    const joined = (await request("tasks")).find((t) => t.id === task.id);
    assert.equal(joined.project_name, "Project");
    assert.equal(joined.tags[0].name, "New tag");
    assert.equal(
      (await request("comments")).find((c) => c.id === comment.id).author_name,
      "Tester",
    );
    await request(`tasks/${task.id}/tags`, "PUT", { tag_ids: [99999] }, 400);
    assert.equal(
      (await request("task-tags")).filter((t) => t.task_id === task.id).length,
      1,
    );
    await request(`tasks/${task.id}`, "PATCH", { project_id: 99999 }, 400);
    await request("users", "POST", [], 400);
    await request(`users/${user.id}`, "PATCH", { name: "Renamed" });
    await request(`projects/${project.id}`, "PATCH", {
      name: "Renamed project",
    });
    await request(`tasks/${task.id}`, "PATCH", {
      title: "Renamed task",
      completed: true,
    });
    await request(`tags/${tag.id}`, "PATCH", { name: "Renamed tag" });
    await request(`comments/${comment.id}`, "PATCH", { body: "Edited" });
    await request(`users/${user.id}`, "DELETE");
    assert.equal((await request(`projects/${project.id}`)).owner_id, null);
    assert.equal((await request(`comments/${comment.id}`)).author_id, null);
    await request(`projects/${project.id}`, "DELETE");
    assert.equal((await request(`tasks/${task.id}`)).project_id, null);
    await request(`tasks/${task.id}`, "DELETE");
    await request(`comments/${comment.id}`, "GET", undefined, 404);
    assert.equal(
      (await request("task-tags")).filter((t) => t.task_id === task.id).length,
      0,
    );
    await request(`tags/${tag.id}`, "DELETE");
    const another = await request("tasks", "POST", { title: "Second" }, 201);
    await request(`tasks/${another.id}/tags`, "PUT", { tag_ids: [1] });
    await request("tags/1", "DELETE");
    assert.equal(
      (await request("task-tags")).filter((t) => t.tag_id === 1).length,
      0,
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

test("server reopening preserves deletions; explicit import restores seeds", () => {
  const dir = mkdtempSync(join(tmpdir(), "project-lab-"));
  const file = join(dir, "test.db");
  try {
    let db = openDatabase(file);
    db.exec("DELETE FROM tasks WHERE id=1");
    db.close();
    db = openDatabase(file);
    assert.equal(db.prepare("SELECT * FROM tasks WHERE id=1").get(), undefined);
    db.close();
    db = openDatabase(file, { seed: true });
    assert.ok(db.prepare("SELECT * FROM tasks WHERE id=1").get());
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
