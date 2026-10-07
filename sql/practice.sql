-- Run statements individually in DB Browser for SQLite / sqlite3.
SELECT * FROM tasks ORDER BY id;
SELECT * FROM tasks WHERE completed = 0;
SELECT completed, COUNT(*) AS total FROM tasks GROUP BY completed;
-- JOIN: comments, tasks and authors.
SELECT t.title, u.name AS author, c.body
FROM comments c
JOIN tasks t ON t.id = c.task_id
LEFT JOIN users u ON u.id = c.author_id;
-- Many-to-many: tags on each task.
SELECT t.title, g.name AS tag
FROM tasks t
JOIN task_tags tt ON tt.task_id = t.id
JOIN tags g ON g.id = tt.tag_id;
-- Include projects with no tasks (COUNT(t.id), not COUNT(*)).
SELECT p.name, u.name AS owner, COUNT(t.id) AS task_count
FROM projects p
LEFT JOIN users u ON u.id = p.owner_id
LEFT JOIN tasks t ON t.project_id = p.id
GROUP BY p.id, p.name, u.name;
-- This exercise rolls back changes so the original data is preserved.
BEGIN TRANSACTION;
UPDATE tasks SET project_id = 1 WHERE id IN (1, 2);
UPDATE tasks SET project_id = 2 WHERE id = 3;
SELECT t.title, p.name AS project FROM tasks t JOIN projects p ON p.id = t.project_id;
INSERT INTO tasks (title) VALUES ('ฝึกเขียน SQL');
UPDATE tasks SET completed = 1 WHERE title = 'ฝึกเขียน SQL';
SELECT * FROM tasks WHERE title = 'ฝึกเขียน SQL';
DELETE FROM tasks WHERE title = 'ฝึกเขียน SQL';
ROLLBACK;
