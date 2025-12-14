

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Pool, Client } = require('pg');

const SERVER_VERSION = '3.5.2';
console.log(`\n\n==================================================`);
console.log(`🚀 STARTING SERVER v${SERVER_VERSION}`);
console.log(`==================================================\n`);

const app = express();
const port = process.env.PORT || 8080;

// Config file path
const CONFIG_FILE = path.join(__dirname, 'db-config.json');

// Global Variables
let pool = null;
let isDbConnected = false;

// --- 1. DATABASE CONFIGURATION & INITIALIZATION ---

const getDbConfig = () => {
    // 1. Try reading from local config file first (created via UI)
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            console.log("📂 Loaded DB config from db-config.json");
            
            const config = {
                user: fileConfig.user,
                password: fileConfig.password,
                database: fileConfig.database,
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 20000, // Increased timeout to 20s
            };

            if (fileConfig.useSocket && fileConfig.instanceConnectionName) {
                config.host = `/cloudsql/${fileConfig.instanceConnectionName}`;
            } else {
                config.host = fileConfig.host;
                config.port = fileConfig.port ? parseInt(fileConfig.port) : 5432;
                config.ssl = { rejectUnauthorized: false };
            }
            return config;
        } catch (e) {
            console.error("⚠️ Error reading db-config.json:", e);
        }
    }

    // 2. Fallback to Environment Variables (Default Mode)
    console.log("🌎 Using Environment Variables/Defaults for DB config");
    const config = {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'Appbaocao1!',
        database: process.env.DB_NAME || 'Appbaocao',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000, // Increased timeout to 20s
    };

    const INSTANCE_CONNECTION_NAME = process.env.INSTANCE_CONNECTION_NAME;
    
    if (process.env.NODE_ENV === 'production' && INSTANCE_CONNECTION_NAME) {
        config.host = `/cloudsql/${INSTANCE_CONNECTION_NAME}`;
    } else {
        config.host = process.env.DB_HOST || '35.198.214.82';
        config.port = 5432;
        config.ssl = { rejectUnauthorized: false };
    }
    
    return config;
};

const initPool = async () => {
    if (pool) {
        await pool.end();
        console.log("Old connection pool closed.");
    }

    const config = getDbConfig();
    console.log(`🔌 Connecting to DB at: ${config.host} (User: ${config.user})`);
    
    pool = new Pool(config);

    // Initial Connection Test
    pool.connect((err, client, release) => {
        if (err) {
            console.error('❌ Database connection FAILED:', err.message);
            isDbConnected = false;
        } else {
            client.query('SELECT NOW()', (err, res) => {
                release();
                if (err) {
                    console.error('❌ Database query error:', err.message);
                    isDbConnected = false;
                } else {
                    console.log('✅ Database connected successfully at:', res.rows[0].now);
                    isDbConnected = true;
                    initSchema();
                }
            });
        }
    });
    
    // Listen for pool errors
    pool.on('error', (err, client) => {
        console.error('❌ Unexpected error on idle client', err);
        isDbConnected = false;
    });
};

const initSchema = async () => {
    if (!pool) return;
    
    const createSessionsTable = `
        CREATE TABLE IF NOT EXISTS sessions (
            id VARCHAR(255) PRIMARY KEY,
            data JSONB NOT NULL,
            report_date TIMESTAMPTZ,
            created_at BIGINT
        );
    `;

    const createTrainingUnitsTable = `
        CREATE TABLE IF NOT EXISTS training_units (
            id VARCHAR(255) PRIMARY KEY,
            code VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            created_at BIGINT
        );
    `;

    try {
        await pool.query(createSessionsTable);
        await pool.query(createTrainingUnitsTable);
        console.log("✅ Tables 'sessions' and 'training_units' verified/created.");
    } catch (err) {
        console.error("❌ Error initializing database schema:", err);
    }
};

// Initialize DB on startup
initPool();

// --- 2. MIDDLEWARE ---
app.enable('trust proxy');
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api', (req, res, next) => {
    console.log(`[API Request] ${req.method} ${req.originalUrl}`);
    next();
});

// --- 3. API ENDPOINTS ---

app.get('/_ping', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'pong', version: SERVER_VERSION });
});

app.get('/api/server-status', (req, res) => {
    res.json({
        success: true,
        version: SERVER_VERSION,
        mode: process.env.NODE_ENV || 'development',
        dbConnected: isDbConnected
    });
});

// Save DB Config and Reconnect
app.post('/api/save-db-config', async (req, res) => {
    try {
        const config = req.body;
        if (!config.user || !config.database) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        await initPool();
        res.json({ success: true, message: "Configuration saved and connection reloaded." });
    } catch (e) {
        console.error("Save config error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Test Connection (Ephemeral)
app.post('/api/check-db-connection', async (req, res) => {
    const { user, password, database, host, port, instanceConnectionName, useSocket } = req.body;
    
    console.log("🛠️ Testing connection...", { user, database, host });

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
        
        res.status(200).json({ 
            success: true, 
            message: `Kết nối thành công!`, 
            details: {
                version: result.rows[0].version
            }
        });
    } catch (err) {
        console.error("❌ Test failed:", err.message);
        res.status(200).json({ success: false, error: err.message });
    }
});

// === B. Business Logic ===

// Ensure DB is connected for these routes
const ensureDb = (req, res, next) => {
    if (!pool || !isDbConnected) {
        // Try to reconnect if global var says disconnected but pool exists
        if (pool) {
             // Passive check?
        }
        return res.status(503).json({ error: "Database not connected" });
    }
    next();
};

app.get('/api/sessions', ensureDb, async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM sessions ORDER BY created_at DESC');
        const sessions = result.rows.map(row => row.data);
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: 'Database Error', details: err.message });
    }
});

app.get('/api/sessions/:id', ensureDb, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT data FROM sessions WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
        res.json(result.rows[0].data);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/sessions', ensureDb, async (req, res) => {
    const session = req.body;
    if (!session || !session.id) return res.status(400).json({ error: 'Invalid session data' });

    const query = `
        INSERT INTO sessions (id, data, report_date, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, report_date = EXCLUDED.report_date;
    `;
    const values = [session.id, JSON.stringify(session), session.reportDate, session.createdAt];

    try {
        await pool.query(query, values);
        res.status(200).json({ message: 'Saved successfully', id: session.id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save session' });
    }
});

app.delete('/api/sessions/:id', ensureDb, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
        res.status(200).json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

app.get('/api/training-units', ensureDb, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM training_units ORDER BY created_at ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Database Error' });
    }
});

app.post('/api/training-units', ensureDb, async (req, res) => {
    const unit = req.body;
    if (!unit.id || !unit.code || !unit.name) return res.status(400).json({ error: 'Missing required fields' });

    const query = `
        INSERT INTO training_units (id, code, name, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name;
    `;
    const createdAt = unit.created_at || Date.now();
    
    try {
        await pool.query(query, [unit.id, unit.code, unit.name, createdAt]);
        res.status(200).json({ message: 'Saved successfully', unit });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save unit' });
    }
});

app.post('/api/training-units/batch', ensureDb, async (req, res) => {
    const units = req.body;
    if (!Array.isArray(units)) return res.status(400).json({ error: 'Expected array of units' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const unit of units) {
             const query = `
                INSERT INTO training_units (id, code, name, created_at)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name;
            `;
            await client.query(query, [unit.id, unit.code, unit.name, unit.created_at || Date.now()]);
        }
        await client.query('COMMIT');
        res.status(200).json({ message: `Imported ${units.length} units` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to import units' });
    } finally {
        client.release();
    }
});

app.delete('/api/training-units/:id', ensureDb, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM training_units WHERE id = $1', [id]);
        res.status(200).json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete unit' });
    }
});

// Fallback for API
app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found` });
});

// --- 4. STATIC FILES ---
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server started on port ${port}`);
});
