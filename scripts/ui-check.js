import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { openDatabase } from "../src/db.js";
import { createApp } from "../src/server.js";
const db = openDatabase(":memory:");
const server = createApp(db);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole("button", { name: "เพิ่มงาน", exact: true }).click();
  await page.getByLabel("ชื่องาน", { exact: true }).fill("UI test task");
  await page.getByRole("combobox", { name: /^โปรเจกต์/ }).selectOption("1");
  await page.getByRole("button", { name: "บันทึก", exact: true }).click();
  await page.getByText("UI test task", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "แก้ไข UI test task", exact: true })
    .click();
  await page.getByLabel("ชื่องาน", { exact: true }).fill("Updated via dialog");
  await page.getByRole("button", { name: "บันทึก", exact: true }).click();
  await page.getByText("Updated via dialog", { exact: true }).waitFor();
  await page
    .getByText("Updated via dialog", { exact: true })
    .locator("..")
    .locator("..")
    .getByRole("button", { name: "รายละเอียด", exact: true })
    .click();
  await page.getByRole("textbox", { name: /^ความคิดเห็น/ }).fill("UI comment");
  await page
    .getByRole("button", { name: "เพิ่มความคิดเห็น", exact: true })
    .click();
  await page.getByText("UI comment", { exact: true }).waitFor();
  const commentId = db
    .prepare("SELECT id FROM comments WHERE body='UI comment'")
    .get().id;
  await page
    .getByRole("button", { name: "แก้ไขความคิดเห็น " + commentId, exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: /^ความคิดเห็น/ })
    .fill("Edited comment");
  await page.getByRole("button", { name: "บันทึก", exact: true }).click();
  await page
    .getByRole("main")
    .getByText("Edited comment", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "ลบความคิดเห็น " + commentId, exact: true })
    .click();
  await page.getByRole("button", { name: "ยืนยันลบ", exact: true }).click();
  await page
    .getByRole("main")
    .getByText("Edited comment", { exact: true })
    .waitFor({ state: "detached" });
  await page
    .getByRole("button", { name: "ปิดรายละเอียด", exact: true })
    .click();
  await page
    .getByRole("button", { name: "ลบ Updated via dialog", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  assert.equal(
    await page
      .getByRole("dialog")
      .getByText("ความคิดเห็นและคู่แท็กทั้งหมดของงานนี้จะถูกลบด้วย", {
        exact: false,
      })
      .count(),
    1,
  );
  await page.getByRole("button", { name: "ยกเลิก", exact: true }).click();
  assert.equal(
    await page.getByText("Updated via dialog", { exact: true }).count(),
    1,
  );
  await page
    .getByRole("button", { name: "ลบ Updated via dialog", exact: true })
    .click();
  await page.getByRole("button", { name: "ยืนยันลบ", exact: true }).click();
  await page
    .getByRole("tabpanel")
    .getByText("Updated via dialog", { exact: true })
    .waitFor({ state: "detached" });
  for (const name of ["โปรเจกต์", "ผู้ใช้", "แท็ก", "งาน"]) {
    await page.getByRole("tab", { name: new RegExp("^" + name) }).click();
    await page
      .getByRole("button", { name: "เพิ่ม" + name, exact: true })
      .waitFor();
  }
  assert.equal(await page.locator(".stat-card").count(), 6);
  assert.ok((await page.locator("svg.lucide").count()) > 10);
  mkdirSync("artifacts", { recursive: true });
  await page.screenshot({
    path: "artifacts/dashboard-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: "artifacts/dashboard-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "UI passed: create/edit dialog, delete cancel/confirm, four tabs, six cards, Lucide SVGs, mobile overflow, no page errors.",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
  db.close();
}
