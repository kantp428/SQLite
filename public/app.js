const $ = (s) => document.querySelector(s);
const names = {
  tasks: "งาน",
  projects: "โปรเจกต์",
  users: "ผู้ใช้",
  tags: "แท็ก",
  comments: "ความคิดเห็น",
  "task-tags": "คู่แท็กของงาน",
};
let data = {},
  tab = "tasks",
  editing = null,
  selected = null,
  busy = false;
function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
async function api(path, method = "GET", body) {
  const r = await fetch("/api/" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await r.json();
  if (!r.ok) throw new Error(result.error);
  return result;
}
async function run(action) {
  if (busy) return;
  busy = true;
  $("#message").textContent = "";
  try {
    await action();
  } catch (e) {
    $("#message").textContent = e.message;
  } finally {
    busy = false;
  }
}
async function load() {
  const keys = Object.keys(names);
  const rows = await Promise.all(keys.map((k) => api(k)));
  data = Object.fromEntries(keys.map((k, i) => [k, rows[i]]));
  $("#stats").replaceChildren();
  for (const k of keys) {
    const box = el("div");
    box.append(el("strong", data[k].length), el("span", names[k]));
    $("#stats").append(box);
  }
  render();
  detail();
}
function button(text, action) {
  const b = el("button", text);
  b.type = "button";
  b.addEventListener("click", () => run(action));
  return b;
}
function field(form, key, title, value = "", options) {
  const label = el("label", title),
    input = el(options ? "select" : key === "body" ? "textarea" : "input");
  input.name = key;
  if (options) {
    for (const item of [{ id: "", name: "ไม่ระบุ" }, ...options]) {
      const option = el("option", item.name);
      option.value = item.id;
      input.append(option);
    }
  } else {
    input.required = true;
    input.maxLength = key === "body" ? 2000 : 200;
    if (key === "email") input.type = "email";
  }
  input.value = value ?? "";
  label.append(input);
  form.append(label);
}
function render() {
  $("#heading").textContent = names[tab];
  for (const n of document.querySelectorAll("[data-tab]"))
    n.classList.toggle("active", n.dataset.tab === tab);
  const form = $("#editor");
  form.replaceChildren();
  const item = {};
  field(
    form,
    tab === "tasks" ? "title" : "name",
    tab === "tasks" ? "ชื่องาน" : "ชื่อ",
    item.title || item.name,
  );
  if (tab === "users") field(form, "email", "อีเมล", item.email);
  if (tab === "projects")
    field(form, "owner_id", "เจ้าของ", item.owner_id, data.users);
  if (tab === "tasks")
    field(form, "project_id", "โปรเจกต์", item.project_id, data.projects);
  const submit = el("button", "เพิ่ม" + names[tab]);
  submit.type = "submit";
  form.append(submit);
  const list = $("#records");
  list.replaceChildren();
  for (const row of data[tab]) {
    const node = el("div", undefined, "row");
    if (tab === "tasks") {
      const check = el("input");
      check.type = "checkbox";
      check.checked = Boolean(row.completed);
      check.setAttribute("aria-label", "สถานะ " + row.title);
      check.addEventListener("change", () =>
        run(async () => {
          try {
            await api("tasks/" + row.id, "PATCH", { completed: check.checked });
          } finally {
            await load();
          }
        }),
      );
      node.append(check);
    }
    const info = el("div", undefined, "info");
    info.append(
      el("strong", row.title || row.name, row.completed ? "done" : ""),
    );
    info.append(
      el(
        "div",
        "#" +
          row.id +
          " · " +
          (tab === "tasks"
            ? row.project_name || "ไม่ระบุโปรเจกต์"
            : tab === "projects"
              ? row.owner_name || "ไม่ระบุเจ้าของ"
              : tab === "users"
                ? row.email
                : "แท็กสำหรับเชื่อมกับงาน"),
        "meta",
      ),
    );
    for (const tag of row.tags || [])
      info.append(el("span", tag.name, "badge"));
    node.append(
      info,
      button("แก้ไข", async () => {
        openEdit(tab, row);
      }),
    );
    if (tab === "tasks")
      node.append(
        button("รายละเอียด", async () => {
          selected = row.id;
          detail();
          $("#detail").scrollIntoView({ behavior: "smooth" });
        }),
      );
    node.append(
      button("ลบ", async () => {
        const effect = {
          tasks: "ความคิดเห็นและคู่แท็กของงานจะถูกลบด้วย",
          users: "เจ้าของและผู้เขียนจะเป็นไม่ระบุ",
          projects: "งานจะเป็นไม่ระบุโปรเจกต์",
          tags: "คู่แท็กของงานจะถูกลบด้วย",
        }[tab];
        if (!confirm("ลบ " + (row.title || row.name) + "? " + effect)) return;
        await api(tab + "/" + row.id, "DELETE");
        await load();
      }),
    );
    list.append(node);
  }
  if (!data[tab].length) list.append(el("p", "ยังไม่มีข้อมูล"));
}
function detail() {
  const task = data.tasks.find((t) => t.id === selected);
  $("#detail").hidden = !task;
  if (!task) {
    selected = null;
    return;
  }
  $("#detail-title").textContent = "รายละเอียด: " + task.title;
  const tags = $("#tag-editor");
  tags.replaceChildren();
  const choices = el("div");
  for (const tag of data.tags) {
    const label = el("label", undefined, "tag-choice"),
      check = el("input");
    check.type = "checkbox";
    check.value = tag.id;
    check.checked = task.tags.some((t) => t.id === tag.id);
    label.append(check, el("span", tag.name));
    choices.append(label);
  }
  tags.append(
    choices,
    button("บันทึกแท็ก", async () => {
      await api("tasks/" + task.id + "/tags", "PUT", {
        tag_ids: [...choices.querySelectorAll("input:checked")].map((n) =>
          Number(n.value),
        ),
      });
      await load();
    }),
  );
  if (!data.tags.length) tags.append(el("p", "สร้างแท็กในหน้าแท็กก่อน"));
  const comments = $("#comments");
  comments.replaceChildren();
  const rows = data.comments.filter((c) => c.task_id === task.id);
  for (const c of rows) {
    const row = el("div", undefined, "row"),
      info = el("div", undefined, "info");
    info.append(
      el("div", c.body),
      el(
        "div",
        (c.author_name || "ไม่ระบุผู้เขียน") + " · " + c.created_at + " UTC",
        "meta",
      ),
    );
    row.append(
      info,
      button("แก้ไข", async () => {
        openEdit("comments", c);
      }),
      button("ลบ", async () => {
        if (!confirm("ลบความคิดเห็นนี้?")) return;
        await api("comments/" + c.id, "DELETE");
        await load();
      }),
    );
    comments.append(row);
  }
  if (!rows.length) comments.append(el("p", "ยังไม่มีความคิดเห็น"));
  const form = $("#comment-form");
  form.replaceChildren();
  field(form, "author_id", "ผู้เขียน", "", data.users);
  field(form, "body", "ข้อความ");
  const submit = el("button", "เพิ่มความคิดเห็น");
  submit.type = "submit";
  form.append(submit);
}
$("#editor").addEventListener("submit", (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.currentTarget));
  run(async () => {
    for (const key of ["owner_id", "project_id"])
      if (key in body) body[key] = body[key] ? Number(body[key]) : null;
    await api(tab, "POST", body);
    await load();
  });
});
$("#comment-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.currentTarget));
  run(async () => {
    body.author_id = body.author_id ? Number(body.author_id) : null;
    body.task_id = selected;
    await api("comments", "POST", body);
    await load();
  });
});
function openEdit(resource, item) {
  editing = { resource, id: item.id };
  $("#edit-title").textContent = "แก้ไข" + names[resource] + " #" + item.id;
  $("#edit-error").textContent = "";
  const form = $("#edit-form");
  form.replaceChildren();
  if (resource === "comments") {
    field(form, "body", "ข้อความ", item.body);
    field(form, "author_id", "ผู้เขียน", item.author_id, data.users);
  } else {
    field(
      form,
      resource === "tasks" ? "title" : "name",
      resource === "tasks" ? "ชื่องาน" : "ชื่อ",
      item.title || item.name,
    );
    if (resource === "users") field(form, "email", "อีเมล", item.email);
    if (resource === "projects")
      field(form, "owner_id", "เจ้าของ", item.owner_id, data.users);
    if (resource === "tasks")
      field(form, "project_id", "โปรเจกต์", item.project_id, data.projects);
  }
  $("#edit-dialog").showModal();
}
$("#edit-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy || !editing) return;
  const target = { ...editing };
  const body = Object.fromEntries(new FormData(event.currentTarget));
  for (const key of ["owner_id", "project_id", "author_id"])
    if (key in body) body[key] = body[key] ? Number(body[key]) : null;
  busy = true;
  $("#edit-error").textContent = "";
  $("#edit-save").disabled = true;
  $("#edit-cancel").disabled = true;
  try {
    await api(target.resource + "/" + target.id, "PATCH", body);
    $("#edit-dialog").close();
    try {
      await load();
    } catch (error) {
      $("#message").textContent =
        "บันทึกแล้ว แต่โหลดรายการไม่สำเร็จ: " + error.message;
    }
  } catch (error) {
    $("#edit-error").textContent = error.message;
  } finally {
    busy = false;
    $("#edit-save").disabled = false;
    $("#edit-cancel").disabled = false;
  }
});
$("#edit-cancel").addEventListener("click", () => {
  if (!busy) $("#edit-dialog").close();
});
$("#edit-dialog").addEventListener("cancel", (event) => {
  if (busy) event.preventDefault();
});
$("#edit-dialog").addEventListener("close", () => {
  editing = null;
});
for (const n of document.querySelectorAll("[data-tab]"))
  n.addEventListener("click", () => {
    if (busy) return;
    tab = n.dataset.tab;
    editing = null;
    selected = null;
    render();
    detail();
  });
run(load);
