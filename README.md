# SQLite Project Lab

โปรเจกต์เรียนรู้ Node.js + SQLite ผ่านระบบจัดการโปรเจกต์ ใช้ 6 ตาราง: users, projects, tasks, comments, tags และ task_tags

## เริ่มใช้งาน

ต้องมี Node.js 24 ขึ้นไป (ทดสอบด้วย 24.14.0)

```powershell
npm install
npm run db:import
npm start
```

เปิด http://localhost:3000 ถ้ามี server รุ่นเดิมเปิดอยู่ ให้หยุดด้วย Ctrl+C แล้วรันใหม่

## ทดลองบนหน้าเว็บ

1. เพิ่มผู้ใช้
2. สร้างโปรเจกต์และเลือกเจ้าของ
3. สร้างแท็ก
4. เพิ่มงานและเลือกโปรเจกต์
5. เปิดรายละเอียดงาน เลือกแท็ก บันทึก และเพิ่มความคิดเห็นพร้อมผู้เขียน
6. แก้ไขชื่อหรือสถานะ แล้วทดลองลบข้อมูลเพื่อดู CASCADE / SET NULL

ทุกข้อมูลหลักเพิ่ม แก้ไข และลบได้ คู่ใน task_tags จัดการผ่านชุดแท็กของงาน การเปิด server ใหม่รักษาข้อมูลและผลการลบ; การสั่ง db:import โดยตั้งใจเติม seed ที่หายกลับมา

## ฐานข้อมูลและเอกสาร

ไฟล์จริง: C:\Users\winne\Desktop\Web\SQLite\data\todo.db เปิดด้วย DB Browser for SQLite ได้

- sql/import.sql: schema และข้อมูลตัวอย่าง
- sql/practice.sql: แบบฝึก SQL และ JOIN
- SQLite.md: คู่มือ ตาราง ความสัมพันธ์ วิธี import และ API
- Presentation.md: เนื้อหา 10 สไลด์ พร้อมบทพูดและสาธิตระบบจริง
- src/server.js: HTTP API และ validation
- src/db.js: เปิดฐานข้อมูลและอัปเกรดไฟล์รุ่นแรก
- public/: HTML, CSS และ JavaScript ของหน้าเว็บ

```powershell
npm run demo
npm run demo:relations
npm test
npm run format:check
```

demo ใช้ฐานข้อมูลในหน่วยความจำ ส่วน demo:relations อ่านฐานข้อมูลไฟล์จริง ตัวอย่างนี้ไม่มี login; ผู้ใช้เป็นข้อมูลเจ้าของ/ผู้เขียนสำหรับเรียนรู้
