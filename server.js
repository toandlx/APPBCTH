const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const SERVER_VERSION = '3.8.1'; // Optimized Session Store
console.log(`\n\n==================================================`);
console.log(`🚀 STARTING SERVER v${SERVER_VERSION}`);
console.log(`==================================================\n`);

const app = express();
const port = process.env.PORT || 8080;

let pool = null;
let isDbConnected = false;

const DB_CONFIG = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Appbaocao1!',
    database: process.env.DB_NAME || 'Appbaocao',
    instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME || 'gen-lang-client-0477980628:asia-southeast1:appbaocao',
    localHost: process.env.DB_HOST || '127.0.0.1',
    localPort: 5432
};

const getPgConfig = () => {
    const useSocket = true;
    const baseConfig = {
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        database: DB_CONFIG.database,
        max: 30,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        keepAlive: true,
        application_name: 'DrivingTestApp_v3.8',
    };

    if (useSocket && DB_CONFIG.instanceConnectionName) {
        return { ...baseConfig, host: `/cloudsql/${DB_CONFIG.instanceConnectionName}` };
    } else {
        return { ...baseConfig, host: DB_CONFIG.localHost, port: DB_CONFIG.localPort };
    }
};

const initPool = async () => {
    if (pool && !pool.ended) {
        try {
            await pool.query('SELECT 1');
            isDbConnected = true;
            return;
        } catch (e) {
            await pool.end();
        }
    }
    const config = getPgConfig();
    pool = new Pool(config);
    pool.connect((err, client, release) => {
        if (err) {
            isDbConnected = false;
        } else {
            client.query('SELECT NOW()', (err, res) => {
                release();
                if (!err) {
                    isDbConnected = true;
                    initSchema();
                }
            });
        }
    });
};

const initSchema = async () => {
    if (!pool) return;
    const queries = [
        `CREATE TABLE IF NOT EXISTS sessions (id VARCHAR(255) PRIMARY KEY, data JSONB NOT NULL, report_date TIMESTAMPTZ, created_at BIGINT);`,
        `CREATE TABLE IF NOT EXISTS training_units (id VARCHAR(255) PRIMARY KEY, code VARCHAR(50) NOT NULL, name VARCHAR(255) NOT NULL, created_at BIGINT);`
    ];
    try {
        for (let q of queries) await pool.query(q);
        console.log("✅ Schema Verified.");
    } catch (err) {
        console.error("❌ Schema Init Error:", err);
    }
};

initPool();

app.enable('trust proxy');
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.get('/api/server-status', async (req, res) => {
    let dbStatus = isDbConnected;
    if (pool) {
        try {
            await pool.query('SELECT 1');
            dbStatus = true;
            isDbConnected = true;
        } catch (e) {
            dbStatus = false;
            isDbConnected = false;
            initPool();
        }
    }
    res.json({
        success: true,
        version: SERVER_VERSION,
        dbConnected: dbStatus,
        dbConfig: { database: DB_CONFIG.database, instance: DB_CONFIG.instanceConnectionName }
    });
});

app.post('/api/check-db-connection', async (req, res) => {
    await initPool();
    setTimeout(() => {
        if (isDbConnected) res.status(200).json({ success: true });
        else res.status(500).json({ success: false });
    }, 1000);
});

const ensureDb = async (req, res, next) => {
    if (!pool || !isDbConnected) {
        await initPool();
        await new Promise(r => setTimeout(r, 500));
    }
    if (!pool) return res.status(503).json({ error: "Database not connected" });
    next();
};

app.get('/api/sessions', ensureDb, async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM sessions ORDER BY created_at DESC');
        res.json(result.rows.map(row => row.data));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sessions/:id', ensureDb, async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM sessions WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0].data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sessions', ensureDb, async (req, res) => {
    const session = req.body;
    if (!session || !session.id) return res.status(400).json({ error: 'Invalid data' });
    const query = `INSERT INTO sessions (id, data, report_date, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, report_date = EXCLUDED.report_date;`;
    try {
        await pool.query(query, [session.id, JSON.stringify(session), session.reportDate, session.createdAt]);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("❌ Save Session Error:", err.message);
        res.status(500).json({ error: 'Save failed', details: err.message });
    }
});

app.delete('/api/sessions/:id', ensureDb, async (req, res) => {
    try {
        await pool.query('DELETE FROM sessions WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/training-units', ensureDb, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM training_units ORDER BY created_at ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/training-units', ensureDb, async (req, res) => {
    const unit = req.body;
    const query = `INSERT INTO training_units (id, code, name, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name;`;
    try {
        await pool.query(query, [unit.id, unit.code, unit.name, unit.created_at || Date.now()]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(port, '0.0.0.0', () => console.log(`🚀 Server started on port ${port}`));