const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool, Client } = require('pg');

const SERVER_VERSION = '3.3.2';
console.log(`\n\n==================================================`);
console.log(`🚀 STARTING SERVER v${SERVER_VERSION}`);
console.log(`==================================================\n`);

const app = express();
const port = process.env.PORT || 8080;

// --- 1. DATABASE CONFIGURATION ---
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Appbaocao1!';
const DB_NAME = process.env.DB_NAME || 'Appbaocao';
const INSTANCE_CONNECTION_NAME = process.env.INSTANCE_CONNECTION_NAME || 'gen-lang-client-0477980628:asia-southeast1:appbaocao';
const PUBLIC_IP = '35.198.214.82';

let dbConfig = {
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};

if (process.env.NODE_ENV === 'production') {
    console.log(`🔌 Connecting via Unix Socket (Production): /cloudsql/${INSTANCE_CONNECTION_NAME}`);
    dbConfig.host = `/cloudsql/${INSTANCE_CONNECTION_NAME}`;
} else {
    console.log(`🔌 Connecting via Public IP (Dev/Local): ${PUBLIC_IP}`);
    dbConfig.host = PUBLIC_IP;
    dbConfig.port = 5432;
    dbConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(dbConfig);

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
    } else {
        console.log('✅ Database connected successfully at:', res.rows[0].now);
        initDb();
    }
});

const initDb = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS sessions (
            id VARCHAR(255) PRIMARY KEY,
            data JSONB NOT NULL,
            report_date TIMESTAMPTZ,
            created_at BIGINT
        );
    `;
    try {
        await pool.query(createTableQuery);
        console.log("✅ Table 'sessions' verified/created.");
    } catch (err) {
        console.error("❌ Error initializing database schema:", err);
    }
};

// --- 2. MIDDLEWARE ---
app.enable('trust proxy');
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Debug Middleware: Log all API requests
app.use('/api', (req, res, next) => {
    console.log(`[API Request] ${req.method} ${req.originalUrl}`);
    next();
});

// --- 3. API ENDPOINTS ---

// === A. System & Diagnostics ===

app.get('/_ping', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'pong', version: SERVER_VERSION });
});

// Endpoint to check server status and version from frontend
app.get('/api/server-status', (req, res) => {
    console.log(`[Status Check] Returning v${SERVER_VERSION}`);
    res.json({
        success: true,
        version: SERVER_VERSION,
        timestamp: new Date().toISOString(),
        mode: process.env.NODE_ENV || 'development'
    });
});

// DB Connection Check Endpoint
app.post('/api/check-db-connection', async (req, res) => {
    const { user, password, database, host, port, instanceConnectionName, useSocket } = req.body;
    
    console.log("🛠️ Checking DB connection...", { user, database, host, useSocket });

    const clientConfig = {
        user,
        password,
        database,
        connectionTimeoutMillis: 5000,
    };

    if (useSocket && instanceConnectionName) {
         clientConfig.host = `/cloudsql/${instanceConnectionName}`;
    } else {
        clientConfig.host = host;
        clientConfig.port = port ? parseInt(port) : 5432;
        clientConfig.ssl = { rejectUnauthorized: false };
    }

    const client = new Client(clientConfig);

    try {
        await client.connect();
        const result = await client.query('SELECT NOW() as now, version() as version');
        await client.end();
        
        console.log("✅ Check successful");
        res.status(200).json({ 
            success: true, 
            message: `Kết nối thành công! (Server v${SERVER_VERSION})`, 
            details: {
                serverTime: result.rows[0].now,
                version: result.rows[0].version
            }
        });
    } catch (err) {
        console.error("❌ Check failed:", err.message);
        res.status(200).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// === B. Business Logic (Sessions) ===

app.get('/api/sessions', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM sessions ORDER BY created_at DESC');
        const sessions = result.rows.map(row => row.data);
        res.json(sessions);
    } catch (err) {
        console.error("GET /api/sessions error:", err.message);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

app.get('/api/sessions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT data FROM sessions WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json(result.rows[0].data);
    } catch (err) {
        console.error(`GET /api/sessions/${id} error:`, err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/sessions', async (req, res) => {
    const session = req.body;
    if (!session || !session.id) {
        return res.status(400).json({ error: 'Invalid session data' });
    }

    const query = `
        INSERT INTO sessions (id, data, report_date, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) 
        DO UPDATE SET 
            data = EXCLUDED.data,
            report_date = EXCLUDED.report_date;
    `;
    
    const values = [session.id, JSON.stringify(session), session.reportDate, session.createdAt];

    try {
        await pool.query(query, values);
        res.status(200).json({ message: 'Saved successfully', id: session.id });
    } catch (err) {
        console.error("POST /api/sessions error:", err.message);
        res.status(500).json({ error: 'Failed to save session' });
    }
});

app.delete('/api/sessions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
        res.status(200).json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error(`DELETE /api/sessions/${id} error:`, err.message);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// === C. Fallback Handlers ===

// Explicit API 404 handler (Must be after all API routes, before static files)
app.all('/api/*', (req, res) => {
    console.warn(`[404] API route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.url}` });
});

// --- 4. STATIC FILES ---
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server started on port ${port}`);
});