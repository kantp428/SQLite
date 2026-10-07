import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Database,
  LayoutDashboard,
  ListTodo,
  FolderKanban,
  Users,
  Tags,
  MessageSquare,
  Link2,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  CheckCircle2,
  Clock3,
  Search,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

const config = {
  tasks: {
    name: "งาน",
    icon: ListTodo,
    color: "blue",
    description: "จัดการงาน เลือกโปรเจกต์ และติดตามความคืบหน้า",
  },
  projects: {
    name: "โปรเจกต์",
    icon: FolderKanban,
    color: "purple",
    description: "รวมงานในโปรเจกต์และกำหนดผู้รับผิดชอบ",
  },
  users: {
    name: "ผู้ใช้",
    icon: Users,
    color: "teal",
    description: "จัดการสมาชิก เจ้าของโปรเจกต์ และผู้เขียนความคิดเห็น",
  },
  tags: {
    name: "แท็ก",
    icon: Tags,
    color: "orange",
    description: "จัดหมวดหมู่งานด้วยแท็กที่ใช้ร่วมกันได้",
  },
  comments: { name: "ความคิดเห็น", icon: MessageSquare, color: "pink" },
  "task-tags": { name: "คู่แท็กของงาน", icon: Link2, color: "slate" },
};
const empty = Object.fromEntries(Object.keys(config).map((key) => [key, []]));
async function api(path, method = "GET", body) {
  const response = await fetch("/api/" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "ไม่สามารถดำเนินการได้");
  return data;
}
function Icon({ icon: Component, ...props }) {
  return (
    <Component size={20} strokeWidth={1.8} aria-hidden="true" {...props} />
  );
}
function Modal({
  title,
  description,
  icon,
  children,
  busy,
  onClose,
  danger = false,
}) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="modal-head">
        <span className={"modal-icon " + (danger ? "danger" : "")}>
          <Icon icon={icon} />
        </span>
        <button
          className="icon-button"
          aria-label="ปิด dialog"
          disabled={busy}
          onClick={onClose}
        >
          <Icon icon={X} />
        </button>
      </div>
      <h2 id="modal-title">{title}</h2>
      <p className="muted">{description}</p>
      {children}
    </dialog>
  );
}
function Fields({ resource, values, setValues, data }) {
  const set = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));
  const text = (key, label, max = 200) => (
    <label key={key}>
      {label}
      {key === "body" ? (
        <textarea
          required
          maxLength={max}
          value={values[key] ?? ""}
          onChange={(e) => set(key, e.target.value)}
          rows={4}
        />
      ) : (
        <input
          required
          type={key === "email" ? "email" : "text"}
          maxLength={max}
          value={values[key] ?? ""}
          onChange={(e) => set(key, e.target.value)}
          placeholder={"กรอก" + label}
        />
      )}
    </label>
  );
  const select = (key, label, items) => (
    <label key={key}>
      {label}
      <select
        value={values[key] ?? ""}
        onChange={(e) =>
          set(key, e.target.value ? Number(e.target.value) : null)
        }
      >
        <option value="">ไม่ระบุ</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
  if (resource === "comments")
    return (
      <>
        {text("body", "ความคิดเห็น", 2000)}
        {select("author_id", "ผู้เขียน", data.users)}
      </>
    );
  return (
    <>
      {text(
        resource === "tasks" ? "title" : "name",
        resource === "tasks" ? "ชื่องาน" : "ชื่อ" + config[resource].name,
      )}
      {resource === "users" && text("email", "อีเมล")}
      {resource === "projects" &&
        select("owner_id", "เจ้าของโปรเจกต์", data.users)}
      {resource === "tasks" && select("project_id", "โปรเจกต์", data.projects)}
    </>
  );
}
function App() {
  const [data, setData] = useState(empty),
    [tab, setTab] = useState("tasks"),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState(null),
    [modal, setModal] = useState(null),
    [values, setValues] = useState({}),
    [dialogError, setDialogError] = useState(""),
    [tagIds, setTagIds] = useState([]),
    [comment, setComment] = useState({ body: "", author_id: null });
  const saving = useRef(false);
  async function load() {
    const keys = Object.keys(config);
    const rows = await Promise.all(keys.map((key) => api(key)));
    setData(Object.fromEntries(keys.map((key, index) => [key, rows[index]])));
  }
  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const task = data.tasks.find((item) => item.id === selected);
  useEffect(() => {
    setTagIds(task?.tags.map((tag) => tag.id) || []);
  }, [task]);
  function navigate(key) {
    if (busy) return;
    setTab(key);
    setQuery("");
    setSelected(null);
    setError("");
    setNotice("");
  }
  function open(resource, item = null, mode = "edit") {
    if (busy) return;
    setDialogError("");
    setValues(
      item
        ? Object.fromEntries(
            (resource === "comments"
              ? ["body", "author_id"]
              : resource === "tasks"
                ? ["title", "project_id"]
                : resource === "projects"
                  ? ["name", "owner_id"]
                  : resource === "users"
                    ? ["name", "email"]
                    : ["name"]
            ).map((key) => [key, item[key]]),
          )
        : {},
    );
    setModal({ resource, item, mode });
  }
  async function mutate(action, message, inside = false) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setDialogError("");
    try {
      await action();
      if (inside) setModal(null);
      setNotice(message);
      try {
        await load();
      } catch (e) {
        setError("บันทึกแล้ว แต่โหลดรายการไม่สำเร็จ: " + e.message);
      }
      return true;
    } catch (e) {
      if (inside) setDialogError(e.message);
      else setError(e.message);
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function save(event) {
    event.preventDefault();
    const body = { ...values };
    for (const key of ["owner_id", "project_id", "author_id"])
      if (key in body) body[key] = body[key] || null;
    if (modal.resource === "comments" && !modal.item) body.task_id = selected;
    mutate(
      () =>
        api(
          modal.resource + (modal.item ? "/" + modal.item.id : ""),
          modal.item ? "PATCH" : "POST",
          body,
        ),
      "บันทึกข้อมูลเรียบร้อย",
      true,
    );
  }
  function remove() {
    mutate(
      () => api(modal.resource + "/" + modal.item.id, "DELETE"),
      "ลบข้อมูลเรียบร้อย",
      true,
    );
  }
  const complete = data.tasks.filter((item) => item.completed).length;
  const rows = data[tab].filter((item) =>
    (item.title || item.name || "").toLowerCase().includes(query.toLowerCase()),
  );
  const TabIcon = config[tab].icon;
  const effects = {
    tasks: "ความคิดเห็นและคู่แท็กทั้งหมดของงานนี้จะถูกลบด้วย",
    projects: "งานในโปรเจกต์ยังอยู่ แต่จะไม่ระบุโปรเจกต์",
    users: "โปรเจกต์และความคิดเห็นยังอยู่ แต่จะไม่ระบุเจ้าของหรือผู้เขียน",
    tags: "แท็กนี้จะถูกนำออกจากทุกงานที่ใช้อยู่",
    comments: "ความคิดเห็นนี้จะถูกลบออกจากงาน",
  };
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">
            <Icon icon={Database} />
          </span>
          <div>
            <strong>Project Lab</strong>
            <span>SQLite learning workspace</span>
          </div>
        </div>
        <span className="connection">
          <i />
          SQLite · Local database
        </span>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <Icon icon={LayoutDashboard} size={16} />
              WORKSPACE OVERVIEW
            </div>
            <h1>ภาพรวมการทำงาน</h1>
            <p>ทีม โปรเจกต์ และทุกงานของคุณในพื้นที่เดียว</p>
          </div>
          <button
            className="button secondary"
            disabled={busy || loading}
            onClick={() => {
              setLoading(true);
              setError("");
              load()
                .catch((e) => setError(e.message))
                .finally(() => setLoading(false));
            }}
          >
            <Icon icon={RefreshCw} />
            รีเฟรชข้อมูล
          </button>
        </div>
        {error && (
          <div role="alert" className="alert error">
            <Icon icon={AlertTriangle} />
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="alert success">
            <Icon icon={CheckCircle2} />
            {notice}
          </div>
        )}
        <section className="stat-grid" aria-label="Dashboard สรุปจำนวนข้อมูล">
          {Object.entries(config).map(([key, value]) => (
            <article className={"stat-card " + value.color} key={key}>
              <div className="stat-top">
                <span className="stat-icon">
                  <Icon icon={value.icon} />
                </span>
                <span className="stat-table">{key}</span>
              </div>
              <p>{value.name}</p>
              <strong>
                {loading ? "—" : data[key].length}
                <small>{key === "task-tags" ? "คู่" : "รายการ"}</small>
              </strong>
              <span className="stat-note">
                {key === "tasks"
                  ? `เสร็จแล้ว ${complete} · คงเหลือ ${data.tasks.length - complete}`
                  : key === "projects"
                    ? "พื้นที่สำหรับจัดกลุ่มงาน"
                    : key === "users"
                      ? "สมาชิกและผู้รับผิดชอบ"
                      : key === "tags"
                        ? "หมวดหมู่ที่ใช้ร่วมกัน"
                        : key === "comments"
                          ? "การสนทนาในงาน"
                          : "ความสัมพันธ์งานกับแท็ก"}
              </span>
            </article>
          ))}
        </section>
        <div className="workspace">
          <div className="tabs" role="tablist" aria-label="หน้าจัดการข้อมูล">
            {["tasks", "projects", "users", "tags"].map((key) => (
              <button
                key={key}
                role="tab"
                id={"tab-" + key}
                aria-selected={tab === key}
                aria-controls="resource-panel"
                tabIndex={tab === key ? 0 : -1}
                className={"tab " + (tab === key ? "active" : "")}
                disabled={busy}
                onClick={() => navigate(key)}
                onKeyDown={(e) => {
                  const keys = ["tasks", "projects", "users", "tags"];
                  let next;
                  if (e.key === "ArrowRight")
                    next = keys[(keys.indexOf(key) + 1) % 4];
                  if (e.key === "ArrowLeft")
                    next = keys[(keys.indexOf(key) + 3) % 4];
                  if (e.key === "Home") next = keys[0];
                  if (e.key === "End") next = keys[3];
                  if (next) {
                    e.preventDefault();
                    navigate(next);
                    document.getElementById("tab-" + next).focus();
                  }
                }}
              >
                <Icon icon={config[key].icon} />
                {config[key].name}
                <span>{data[key].length}</span>
              </button>
            ))}
          </div>
          <section
            id="resource-panel"
            role="tabpanel"
            aria-labelledby={"tab-" + tab}
            className="resource-panel"
          >
            <div className="panel-heading">
              <div>
                <h2>
                  <Icon icon={TabIcon} />
                  {config[tab].name}ทั้งหมด{" "}
                  <span className="count-pill">{data[tab].length}</span>
                </h2>
                <p>{config[tab].description}</p>
              </div>
              <button
                className="button primary"
                disabled={busy || loading}
                onClick={() => open(tab)}
              >
                <Icon icon={Plus} />
                เพิ่ม{config[tab].name}
              </button>
            </div>
            <label className="search">
              <Icon icon={Search} />
              <input
                aria-label={"ค้นหา" + config[tab].name}
                placeholder={"ค้นหา" + config[tab].name + "..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="list-header">
              <span>
                {tab === "tasks"
                  ? "งาน / โปรเจกต์"
                  : tab === "users"
                    ? "ชื่อ / อีเมล"
                    : tab === "projects"
                      ? "โปรเจกต์ / เจ้าของ"
                      : "แท็ก / จำนวนงาน"}
              </span>
              <span>จัดการ</span>
            </div>
            {loading ? (
              <div className="empty">กำลังโหลดข้อมูล...</div>
            ) : rows.length === 0 ? (
              <div className="empty">
                <Icon icon={TabIcon} size={36} />
                <h3>
                  {query
                    ? "ไม่พบข้อมูลที่ค้นหา"
                    : "ยังไม่มี" + config[tab].name}
                </h3>
                <p>
                  {query
                    ? "ลองเปลี่ยนคำค้นหา"
                    : "กดปุ่มเพิ่มด้านบนเพื่อเริ่มต้น"}
                </p>
              </div>
            ) : (
              rows.map((item) => (
                <div
                  className={"record " + (item.completed ? "completed" : "")}
                  key={item.id}
                >
                  {tab === "tasks" ? (
                    <input
                      className="task-check"
                      type="checkbox"
                      aria-label={"สถานะ " + item.title}
                      checked={Boolean(item.completed)}
                      disabled={busy}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        mutate(
                          () =>
                            api("tasks/" + item.id, "PATCH", {
                              completed: checked,
                            }),
                          "อัปเดตสถานะแล้ว",
                        );
                      }}
                    />
                  ) : (
                    <span className={"record-icon " + config[tab].color}>
                      <Icon icon={TabIcon} />
                    </span>
                  )}
                  <div className="record-info">
                    <strong>{item.title || item.name}</strong>
                    <p>
                      <span>#{item.id}</span> ·{" "}
                      {tab === "tasks"
                        ? item.project_name || "ไม่ระบุโปรเจกต์"
                        : tab === "projects"
                          ? item.owner_name || "ไม่ระบุเจ้าของ"
                          : tab === "users"
                            ? item.email
                            : `ใช้ใน ${data["task-tags"].filter((pair) => pair.tag_id === item.id).length} งาน`}
                    </p>
                    {item.tags?.length > 0 && (
                      <div className="badges">
                        {item.tags.map((tag) => (
                          <span className="badge" key={tag.id}>
                            <Icon icon={Tags} size={12} />
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {tab === "tasks" && (
                    <span
                      className={
                        "status " + (item.completed ? "done" : "pending")
                      }
                    >
                      <Icon
                        icon={item.completed ? CheckCircle2 : Clock3}
                        size={14}
                      />
                      {item.completed ? "เสร็จแล้ว" : "กำลังดำเนินการ"}
                    </span>
                  )}
                  <div className="record-actions">
                    {tab === "tasks" && (
                      <button
                        className="button detail-button"
                        disabled={busy}
                        onClick={() => {
                          setSelected(item.id);
                          setComment({ body: "", author_id: null });
                        }}
                      >
                        <Icon icon={ArrowUpRight} size={16} />
                        รายละเอียด
                      </button>
                    )}
                    <button
                      className="icon-button"
                      disabled={busy}
                      aria-label={"แก้ไข " + (item.title || item.name)}
                      title="แก้ไข"
                      onClick={() => open(tab, item)}
                    >
                      <Icon icon={Pencil} size={17} />
                    </button>
                    <button
                      className="icon-button delete-button"
                      disabled={busy}
                      aria-label={"ลบ " + (item.title || item.name)}
                      title="ลบ"
                      onClick={() => open(tab, item, "delete")}
                    >
                      <Icon icon={Trash2} size={17} />
                    </button>
                  </div>
                </div>
              ))
            )}
            <div className="list-footer">
              แสดง {rows.length} จาก {data[tab].length} รายการ{" "}
              <span>ข้อมูลจาก SQLite</span>
            </div>
          </section>
        </div>
        {task && (
          <section className="task-detail">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">TASK DETAILS · #{task.id}</div>
                <h2>{task.title}</h2>
              </div>
              <button
                className="icon-button"
                aria-label="ปิดรายละเอียด"
                onClick={() => setSelected(null)}
              >
                <Icon icon={X} />
              </button>
            </div>
            <div className="detail-grid">
              <div>
                <h3>
                  <Icon icon={Tags} />
                  แท็กของงาน
                </h3>
                <p className="muted">เลือกได้หลายแท็ก แล้วบันทึกชุดแท็ก</p>
                <div className="tag-choices">
                  {data.tags.map((tag) => (
                    <label
                      key={tag.id}
                      className={
                        "tag-choice " +
                        (tagIds.includes(tag.id) ? "chosen" : "")
                      }
                    >
                      <input
                        type="checkbox"
                        checked={tagIds.includes(tag.id)}
                        disabled={busy}
                        onChange={(e) =>
                          setTagIds((prev) =>
                            e.target.checked
                              ? [...prev, tag.id]
                              : prev.filter((id) => id !== tag.id),
                          )
                        }
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
                {data.tags.length === 0 && <p>เพิ่มแท็กในหน้าแท็กก่อน</p>}
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    mutate(
                      () =>
                        api("tasks/" + task.id + "/tags", "PUT", {
                          tag_ids: tagIds,
                        }),
                      "บันทึกแท็กแล้ว",
                    )
                  }
                >
                  <Icon icon={Save} size={16} />
                  บันทึกแท็ก
                </button>
              </div>
              <div>
                <h3>
                  <Icon icon={MessageSquare} />
                  ความคิดเห็น{" "}
                  <span className="count-pill">
                    {data.comments.filter((c) => c.task_id === task.id).length}
                  </span>
                </h3>
                {data.comments
                  .filter((c) => c.task_id === task.id)
                  .map((c) => (
                    <div className="comment" key={c.id}>
                      <div>
                        <strong>{c.author_name || "ไม่ระบุผู้เขียน"}</strong>
                        <small>{c.created_at} UTC</small>
                        <p>{c.body}</p>
                      </div>
                      <div className="record-actions">
                        <button
                          className="icon-button"
                          aria-label={"แก้ไขความคิดเห็น " + c.id}
                          disabled={busy}
                          onClick={() => open("comments", c)}
                        >
                          <Icon icon={Pencil} size={16} />
                        </button>
                        <button
                          className="icon-button delete-button"
                          aria-label={"ลบความคิดเห็น " + c.id}
                          disabled={busy}
                          onClick={() => open("comments", c, "delete")}
                        >
                          <Icon icon={Trash2} size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                <form
                  className="comment-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const success = await mutate(
                      () =>
                        api("comments", "POST", {
                          ...comment,
                          task_id: task.id,
                        }),
                      "เพิ่มความคิดเห็นแล้ว",
                    );
                    if (success) setComment({ body: "", author_id: null });
                  }}
                >
                  <Fields
                    resource="comments"
                    values={comment}
                    setValues={setComment}
                    data={data}
                  />
                  <button className="button primary" disabled={busy}>
                    <Icon icon={Plus} size={16} />
                    เพิ่มความคิดเห็น
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}
        <footer>
          <span>
            <Icon icon={Database} size={14} /> SQLite Project Lab
          </span>
          <span>Node.js + React · 6 ตารางสัมพันธ์</span>
        </footer>
      </main>
      {modal && (
        <Modal
          title={
            modal.mode === "delete"
              ? "ยืนยันการลบ" + config[modal.resource].name
              : (modal.item ? "แก้ไข" : "เพิ่ม") + config[modal.resource].name
          }
          description={
            modal.mode === "delete"
              ? "ตรวจสอบข้อมูลก่อนยืนยันการลบ"
              : "กรอกข้อมูลแล้วกดบันทึกเพื่ออัปเดตฐานข้อมูล"
          }
          icon={modal.mode === "delete" ? Trash2 : modal.item ? Pencil : Plus}
          danger={modal.mode === "delete"}
          busy={busy}
          onClose={() => setModal(null)}
        >
          {dialogError && (
            <div role="alert" className="alert error">
              {dialogError}
            </div>
          )}
          {modal.mode === "delete" ? (
            <>
              <div className="delete-preview">
                <strong>
                  {modal.item.title || modal.item.name || modal.item.body}
                </strong>
                <span>#{modal.item.id}</span>
              </div>
              <div className="delete-warning">
                <Icon icon={AlertTriangle} />
                <p>
                  {effects[modal.resource]}
                  <br />
                  เมื่อลบแล้วจะไม่สามารถย้อนกลับจากหน้านี้ได้
                </p>
              </div>
              <div className="modal-actions">
                <button
                  autoFocus
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  ยกเลิก
                </button>
                <button
                  className="button danger"
                  disabled={busy}
                  onClick={remove}
                >
                  <Icon icon={Trash2} size={16} />
                  {busy ? "กำลังลบ..." : "ยืนยันลบ"}
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={save}>
              <fieldset disabled={busy}>
                <Fields
                  resource={modal.resource}
                  values={values}
                  setValues={setValues}
                  data={data}
                />
              </fieldset>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  ยกเลิก
                </button>
                <button className="button primary" disabled={busy}>
                  <Icon icon={Save} size={16} />
                  {busy ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
