import { test } from "node:test";
import assert from "node:assert/strict";
import { openDatabase, taskStore } from "../src/db.js";
import { createApp } from "../src/server.js";
import { readFileSync } from "node:fs";

test("SQL import is repeatable; CRUD uses bound values and enforces constraints", () => {
  const db = openDatabase(":memory:");
  try {
    db.exec(
      readFileSync(new URL("../sql/import.sql", import.meta.url), "utf8"),
    );
    const tasks = taskStore(db);
    assert.equal(tasks.list().length, 3);
    const title = "'); DROP TABLE tasks; --";
    const task = tasks.create(title);
    assert.equal(task.title, title);
    assert.equal(tasks.update(task.id, true).completed, 1);
    assert.throws(() => tasks.create("  "));
    assert.equal(tasks.remove(task.id), true);
    assert.equal(tasks.get(task.id), undefined);
    assert.equal(tasks.list().length, 3);
  } finally {
    db.close();
  }
});

test("HTTP CRUD and invalid requests", async () => {
  const db = openDatabase(":memory:");
  const server = createApp(db);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const request = (path, method = "GET", body) =>
    fetch(url + path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  try {
    assert.equal((await request("/")).status, 200);
    assert.equal((await (await request("/api/tasks")).json()).length, 3);
    const response = await request("/api/tasks", "POST", {
      title: "ทดสอบ API",
    });
    assert.equal(response.status, 201);
    const task = await response.json();
    const updated = await request(`/api/tasks/${task.id}`, "PATCH", {
      completed: true,
    });
    assert.equal((await updated.json()).completed, 1);
    assert.equal(
      (await request(`/api/tasks/${task.id}`, "DELETE")).status,
      200,
    );
    assert.equal(
      (await request(`/api/tasks/${task.id}`, "PATCH", { completed: false }))
        .status,
      404,
    );
    assert.equal(
      (await request("/api/tasks", "POST", { title: "" })).status,
      400,
    );
    assert.equal(
      (await request("/api/tasks/1", "PATCH", { completed: "true" })).status,
      400,
    );
    assert.equal(
      (await fetch(url + "/api/tasks", { method: "POST", body: "{" })).status,
      400,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
