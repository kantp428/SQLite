import { openDatabase, defaultPath } from "../src/db.js";
const db = openDatabase(undefined, { seed: true });
console.log(`Import สำเร็จ: ${defaultPath}`);
console.table(db.prepare("SELECT * FROM tasks").all());
db.close();
