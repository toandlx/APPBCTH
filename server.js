
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const SERVER_VERSION = '3.7.2'; // Optimized Connection Mode
console.log(`\n\n==================================================`);
console.log(`🚀 STARTING SERVER v${SERVER_VERSION}`);
console.log(`==================================================\n`);

const app = express();
const port = process.env.PORT || 8080;

// Global Variables
let pool = null;
let isDbConnected = false;

// --- 1. DATABASE CONFIGURATION (SECURE SERVER-SIDE) ---

// ⚠️ CẤU HÌNH KẾT NỐI DATABASE TẠI ĐÂY HOẶC QUA BIẾN MÔI TRƯỜNG
const DB_CONFIG = {
    user: process.env.DB_USER || 'postgres',         // Tên đăng nhập DB
    password: process.env.DB_PASSWORD || 'Appbaocao1!',   // Mật khẩu DB (Sửa tại đây)
    database: process.env.DB_NAME || 'Appbaocao',    // Tên Database
    
    // Tên kết nối Cloud SQL (Unix Socket)
    // Định dạng: project-id:region:instance-name
    instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME || 'gen-lang-client-0477980628:asia-southeast1:appbaocao',
    
    // Fallback cho chạy local (nếu không có Unix Socket)
    localHost: process.env.DB_HOST || '127.0.0.1',
    localPort: 5432
};

const getPgConfig = () => {
    // Ưu tiên dùng Unix Socket cho Cloud Run
    // Kiểm tra xem đang chạy trên môi trường có hỗ trợ Socket không (hoặc mặc định luôn dùng nếu deploy Cloud Run)
    const useSocket = true; // Mặc định True cho Cloud Run

    const baseConfig = {
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        database: DB_CONFIG.database,
        max: 20, // Tăng số lượng kết nối tối đa
        idleTimeoutMillis: 600000, // 10 phút (Giữ kết nối lâu hơn để tránh bị ngắt)
        connectionTimeoutMillis: 10000, // 10s chờ kết nối
        keepAlive: true, // QUAN TRỌNG: Giữ kết nối TCP luôn sống
        application_name: 'DrivingTestApp_v3.7', // Giúp DBA dễ theo dõi
    };

    if (useSocket && DB_CONFIG.instanceConnectionName) {
        console.log(`🔒 Configuring for Unix Socket: ${DB_CONFIG.instanceConnectionName}`);
        return {
            ...baseConfig,
            host: `/cloudsql/${DB_CONFIG.instanceConnectionName}`, // Đường dẫn chuẩn của Cloud SQL Auth Proxy
        };
    } else {
        console.log(`💻 Configuring for TCP (Localhost): ${DB_CONFIG.localHost}`);
        return {
            ...baseConfig,
            host: DB_CONFIG.localHost,
            port: DB_CONFIG.localPort,
            ssl: { rejectUnauthorized: false }, // Dev mode often needs this for TCP
        };
    }
};

const initPool = async () => {
    // Nếu pool đã tồn tại và chưa kết thúc, không cần tạo lại trừ khi force
    if (pool && !pool.ended) {
        console.log("⚠️ Pool already active. Checking status...");
        try {
            await pool.query('SELECT 1');
            isDbConnected = true;
            return;
        } catch (e) {
            console.log("⚠️ Existing pool is stale. Recreating...");
            await pool.end();
        }
    }

    const config = getPgConfig();
    console.log(`🔌 Connecting to DB [${config.database}] as user [${config.user}]...`);
    
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
    
    pool.on('error', (err, client) => {
        console.error('❌ Unexpected error on idle client', err);
        // Không set false ngay lập tức, để request tiếp theo tự retry kết nối
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
        
        // Migration helper
        await pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_units' AND column_name='created_at') THEN
                    ALTER TABLE training_units ADD COLUMN created_at BIGINT;
                END IF;
            END
            $$;
        `);
        console.log("✅ Database Schema Verified.");
    } catch (err) {
        console.error("❌ Error initializing schema:", err);
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
    // Log nhẹ hơn để tránh spam log
    if (req.originalUrl !== '/api/server-status') {
        console.log(`[API Request] ${req.method} ${req.originalUrl}`);
    }
    next();
});

// --- 3. API ENDPOINTS ---

app.get('/_ping', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'pong', version: SERVER_VERSION });
});

app.get('/api/server-status', async (req, res) => {
    // Heartbeat check thực sự tới DB
    let dbStatus = isDbConnected;
    if (pool) {
        try {
            await pool.query('SELECT 1');
            dbStatus = true;
            isDbConnected = true;
        } catch (e) {
            dbStatus = false;
            isDbConnected = false;
            console.warn("⚠️ Heartbeat failed: DB connection lost.");
            // Thử kết nối lại ngầm (background)
            initPool(); 
        }
    }

    res.json({
        success: true,
        version: SERVER_VERSION,
        mode: 'Production (Persistent)',
        dbConnected: dbStatus,
        dbConfig: {
            user: DB_CONFIG.user,
            database: DB_CONFIG.database,
            instance: DB_CONFIG.instanceConnectionName
        }
    });
});

// Re-check Connection Trigger (Manual retry from UI)
app.post('/api/check-db-connection', async (req, res) => {
    console.log("🛠️ Manual connection check requested...");
    
    // Force re-init pool
    await initPool();

    // Wait a bit for connection to establish
    setTimeout(() => {
        if (isDbConnected) {
            res.status(200).json({ success: true, message: `Kết nối Database ổn định.` });
        } else {
            res.status(500).json({ success: false, error: "Không thể kết nối Database. Kiểm tra log Server." });
        }
    }, 1000);
});

// === B. Business Logic ===

const ensureDb = async (req, res, next) => {
    // Tự động thử kết nối lại nếu thấy mất kết nối
    if (!pool || !isDbConnected) {
        console.log("⚠️ DB check failed in middleware. Attempting reconnect...");
        await initPool();
        // Chờ nhẹ 500ms
        await new Promise(r => setTimeout(r, 500));
    }

    if (!pool) {
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
        console.error("Error saving session:", err);
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
        console.error("Error saving training unit:", err);
        res.status(500).json({ error: 'Failed to save unit', details: err.message });
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
        console.error("Error batch importing units:", err);
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Failed to import units', details: err.message });
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
