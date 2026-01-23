
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const SERVER_VERSION = '4.1.1';
console.log(`\n\n[APPBCTH] Starting Server v${SERVER_VERSION} - Cloud SQL Optimized`);

const app = express();
const port = process.env.PORT || 8080;

let pool = null;
let isDbConnected = false;
let lastDbError = null;

const INSTANCE_NAME = (process.env.INSTANCE_CONNECTION_NAME || process.env.CLOUD_SQL_CONNECTION_NAME || '').trim();
const DB_USER = (process.env.DB_USER || 'postgres').trim();
const DB_PASS = (process.env.DB_PASSWORD || 'Appbaocao1!').trim();
const DB_NAME = (process.env.DB_NAME || 'Appbaocao').trim();
const DB_HOST = (process.env.DB_HOST || '127.0.0.1').trim();
const DB_PORT = process.env.DB_PORT || 5432;

const connectWithRetry = async (retries = 5) => {
    const config = {
        user: DB_USER,
        password: DB_PASS,
        database: DB_NAME,
        max: 25,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
    };

    if (INSTANCE_NAME) {
        config.host = `/cloudsql/${INSTANCE_NAME}`;
        console.log(`[DB] Configuring Cloud SQL socket connection: ${INSTANCE_NAME}`);
    } else {
        config.host = DB_HOST;
        config.port = parseInt(DB_PORT, 10);
        console.log(`[DB] Configuring TCP connection to ${DB_HOST}:${DB_PORT}`);
    }

    try {
        if (pool) await pool.end().catch(() => {});
        pool = new Pool(config);
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        isDbConnected = true;
        lastDbError = null;
        console.log("✅ [DB] Successfully connected to Cloud SQL.");
        await ensureSchema();
    } catch (err) {
        isDbConnected = false;
        lastDbError = err.message;
        console.error("❌ [DB] Connection Failed:", err.message);
        if (retries > 0) {
            console.log(`[DB] Retrying in 5s... (${retries} attempts left)`);
            setTimeout(() => connectWithRetry(retries - 1), 5000);
        }
    }
};

const ensureSchema = async () => {
    if (!pool) return;
    const queries = [
        `CREATE TABLE IF NOT EXISTS sessions (
            id VARCHAR(255) PRIMARY KEY, 
            data JSONB NOT NULL, 
            report_date TIMESTAMPTZ, 
            created_at BIGINT
        );`,
        `CREATE TABLE IF NOT EXISTS training_units (
            id VARCHAR(255) PRIMARY KEY, 
            code VARCHAR(50) NOT NULL, 
            name VARCHAR(255) NOT NULL, 
            created_at BIGINT
        );`
    ];
    try {
        for (let q of queries) await pool.query(q);
        console.log("✅ [DB] Schema verified.");
    } catch (err) { 
        console.error("❌ [DB] Schema Setup Error:", err.message); 
    }
};

connectWithRetry();

app.use(cors());
app.use(express.json({ limit: '60mb' }));

// MỚI: API lấy toàn bộ dữ liệu chi tiết của các session
app.get('/api/sessions', async (req, res) => {
    if (!isDbConnected) return res.status(503).json({ error: "Database Offline" });
    try {
        const result = await pool.query('SELECT data FROM sessions ORDER BY created_at DESC');
        res.json(result.rows.map(row => row.data));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/sessions/summary', async (req, res) => {
    if (!isDbConnected) return res.status(503).json({ error: "Database Offline" });
    try {
        const result = await pool.query(`
            SELECT id, data->>'name' as name, report_date as "reportDate", created_at as "createdAt",
            data->'grandTotal' as "grandTotal", jsonb_array_length(data->'studentRecords') as "studentCount"
            FROM sessions ORDER BY created_at DESC`);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sessions', async (req, res) => {
    if (!isDbConnected) return res.status(503).json({ error: "Database Offline" });
    const s = req.body;
    try {
        await pool.query(
            `INSERT INTO sessions (id, data, report_date, created_at) VALUES ($1, $2, $3, $4) 
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, report_date = EXCLUDED.report_date`,
            [s.id, JSON.stringify(s), s.reportDate, s.createdAt]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/sessions/:id', async (req, res) => {
    if (!isDbConnected) return res.status(503).json({ error: "Database Offline" });
    try {
        const result = await pool.query('SELECT data FROM sessions WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0].data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/training-units', async (req, res) => {
    if (!isDbConnected) return res.status(503).json({ error: "Database Offline" });
    try {
        const result = await pool.query('SELECT * FROM training_units ORDER BY created_at ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/server-status', (req, res) => {
    res.json({ 
        success: true, 
        version: SERVER_VERSION, 
        dbConnected: isDbConnected, 
        dbError: lastDbError,
        environment: INSTANCE_NAME ? 'Cloud' : 'Local'
    });
});

app.delete('/api/sessions/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM sessions WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 [APPBCTH] Server v${SERVER_VERSION} online on port ${port}`);
});
