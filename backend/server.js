const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3000);
const dbHost = process.env.DB_HOST || 'db';

const pool = new Pool({
  host: dbHost,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 5432)
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/todos', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, title, completed, created_at FROM todos ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/todos', async (req, res, next) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';

  if (!title) {
    return res.status(400).json({ error: 'El título de la tarea es obligatorio.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO todos (title) VALUES ($1) RETURNING id, title, completed, created_at',
      [title]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.put('/todos/:id', async (req, res, next) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: 'El ID de la tarea no es válido.' });
  }

  const updates = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'title')) {
    if (typeof req.body.title !== 'string' || !req.body.title.trim()) {
      return res.status(400).json({ error: 'El título de la tarea no puede estar vacío.' });
    }

    values.push(req.body.title.trim());
    updates.push(`title = $${values.length}`);
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'completed')) {
    if (typeof req.body.completed !== 'boolean') {
      return res.status(400).json({ error: 'El estado completado debe ser verdadero o falso.' });
    }

    values.push(req.body.completed);
    updates.push(`completed = $${values.length}`);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Indica el título o estado que deseas actualizar.' });
  }

  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE todos SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING id, title, completed, created_at`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No se encontró la tarea.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete('/todos/:id', async (req, res, next) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: 'El ID de la tarea no es válido.' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM todos WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No se encontró la tarea.' });
    }

    res.json({ message: 'Tarea eliminada correctamente.', id: result.rows[0].id });
  } catch (error) {
    next(error);
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', db_host: dbHost });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    res.status(503).json({ status: 'error', database: 'disconnected', db_host: dbHost });
  }
});

app.use((error, req, res, next) => {
  console.error('Request failed:', error.message);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500
    ? error.status
    : 500;
  res.status(status).json({
    error: status === 400 ? 'El cuerpo de la solicitud no es válido.' : 'Ocurrió un error interno.'
  });
});

async function start() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(
    'ALTER TABLE todos ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE'
  );

  app.listen(port, '0.0.0.0', () => {
    console.log(`ToDoApp listening on port ${port}; database host: ${dbHost}`);
  });
}

start().catch((error) => {
  console.error('Unable to initialize the application:', error);
  process.exitCode = 1;
});
