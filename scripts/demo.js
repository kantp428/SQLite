import { openDatabase, taskStore } from "../src/db.js";
// In-memory database: this demo does not modify data/todo.db.
const db = openDatabase(":memory:");
const tasks = taskStore(db);
console.log("READ");
console.table(tasks.list());
console.log("CREATE");
const task = tasks.create("งานจาก Node.js");
console.table([task]);
console.log("UPDATE");
console.table([tasks.update(task.id, true)]);
console.log("DELETE");
console.log(tasks.remove(task.id));
db.close();
