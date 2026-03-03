import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import morgan from "morgan";
import cron from "node-cron";
import fs from "fs-extra";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment Variable Validation
const requiredEnv = ["NODE_ENV"];
if (process.env.NODE_ENV === "production") {
  requiredEnv.push("APP_URL");
  requiredEnv.push("PAYMENT_WEBHOOK_SECRET");
}

requiredEnv.forEach(env => {
  if (!process.env[env]) {
    throw new Error(`Critical Error: ${env} environment variable is not set.`);
  }
});

const db = new Database("nexa.db");
db.pragma('foreign_keys = ON');

// Monetary Helpers
const toCents = (val: number | null | undefined) => Math.round((val || 0) * 100);
const fromCents = (val: number | null | undefined) => (val || 0) / 100;

// Helper to add column if not exists
const addColumnIfNotExists = (table: string, column: string, type: string) => {
  try {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    if (!columns.find(c => c.name === column)) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
      console.log(`Added column ${column} to ${table}`);
    }
  } catch (e) {
    console.error(`Error adding column ${column} to ${table}:`, e);
  }
};

// Migration: REAL to INTEGER (cents)
const migrateToCents = () => {
  const tablesToMigrate = [
    { name: 'inventory', cols: ['unit_price', 'cost_price'] },
    { name: 'transactions', cols: ['amount', 'cash_amount', 'credit_amount', 'online_amount'] },
    { name: 'loans', cols: ['amount', 'remaining_amount'] }
  ];

  tablesToMigrate.forEach(table => {
    const info = db.prepare(`PRAGMA table_info(${table.name})`).all() as any[];
    const needsMigration = info.some(c => table.cols.includes(c.name) && c.type.toUpperCase() === 'REAL');

    if (needsMigration) {
      console.log(`Migrating ${table.name} to integer cents...`);
      db.transaction(() => {
        // 1. Rename old table
        db.prepare(`ALTER TABLE ${table.name} RENAME TO ${table.name}_old`).run();

        // 2. Create new table with INTEGER columns
        // We'll use the original CREATE TABLE statements but with INTEGER
        if (table.name === 'inventory') {
          db.exec(`
            CREATE TABLE inventory (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              sku TEXT UNIQUE NOT NULL,
              category TEXT,
              quantity INTEGER DEFAULT 0 CHECK(quantity >= 0),
              unit_price INTEGER DEFAULT 0 CHECK(unit_price >= 0),
              cost_price INTEGER DEFAULT 0 CHECK(cost_price >= 0),
              min_stock_level INTEGER DEFAULT 5 CHECK(min_stock_level >= 0)
            )
          `);
          db.prepare(`
            INSERT INTO inventory (id, name, sku, category, quantity, unit_price, cost_price, min_stock_level)
            SELECT id, name, sku, category, quantity, CAST(ROUND(unit_price * 100) AS INTEGER), CAST(ROUND(cost_price * 100) AS INTEGER), min_stock_level
            FROM inventory_old
          `).run();
        } else if (table.name === 'transactions') {
          db.exec(`
            CREATE TABLE transactions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              type TEXT CHECK(type IN ('Sale', 'Expense')) NOT NULL,
              amount INTEGER NOT NULL CHECK(amount >= 0),
              description TEXT,
              date DATETIME DEFAULT CURRENT_TIMESTAMP,
              category TEXT,
              staff_id INTEGER,
              customer_id INTEGER,
              product_type TEXT,
              cash_amount INTEGER DEFAULT 0 CHECK(cash_amount >= 0),
              credit_amount INTEGER DEFAULT 0 CHECK(credit_amount >= 0),
              online_amount INTEGER DEFAULT 0 CHECK(online_amount >= 0),
              transfer_image TEXT,
              FOREIGN KEY(staff_id) REFERENCES users(id) ON DELETE SET NULL,
              FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL
            )
          `);
          db.prepare(`
            INSERT INTO transactions (id, type, amount, description, date, category, staff_id, customer_id, product_type, cash_amount, credit_amount, online_amount, transfer_image)
            SELECT id, type, CAST(ROUND(amount * 100) AS INTEGER), description, date, category, staff_id, customer_id, product_type, CAST(ROUND(cash_amount * 100) AS INTEGER), CAST(ROUND(credit_amount * 100) AS INTEGER), CAST(ROUND(online_amount * 100) AS INTEGER), transfer_image
            FROM transactions_old
          `).run();
        } else if (table.name === 'loans') {
          db.exec(`
            CREATE TABLE loans (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              customer_id INTEGER NOT NULL,
              amount INTEGER NOT NULL CHECK(amount >= 0),
              remaining_amount INTEGER NOT NULL CHECK(remaining_amount >= 0),
              due_date DATE NOT NULL,
              status TEXT CHECK(status IN ('Active', 'Paid', 'Overdue')) NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
            )
          `);
          db.prepare(`
            INSERT INTO loans (id, customer_id, amount, remaining_amount, due_date, status, created_at)
            SELECT id, customer_id, CAST(ROUND(amount * 100) AS INTEGER), CAST(ROUND(remaining_amount * 100) AS INTEGER), due_date, status, created_at
            FROM loans_old
          `).run();
        }

        // 3. Drop old table
        db.prepare(`DROP TABLE ${table.name}_old`).run();
      })();
    }
  });
};

// Initialize Database with constraints
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('Owner', 'Manager', 'Staff')) NOT NULL,
    full_name TEXT NOT NULL,
    plan TEXT DEFAULT 'Trial',
    trial_end_date DATETIME,
    subscription_status TEXT DEFAULT 'Active'
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT,
    quantity INTEGER DEFAULT 0 CHECK(quantity >= 0),
    unit_price INTEGER DEFAULT 0 CHECK(unit_price >= 0),
    cost_price INTEGER DEFAULT 0 CHECK(cost_price >= 0),
    min_stock_level INTEGER DEFAULT 5 CHECK(min_stock_level >= 0)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT CHECK(type IN ('Sale', 'Expense')) NOT NULL,
    amount INTEGER NOT NULL CHECK(amount >= 0),
    description TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    category TEXT,
    staff_id INTEGER,
    customer_id INTEGER,
    product_type TEXT,
    cash_amount INTEGER DEFAULT 0 CHECK(cash_amount >= 0),
    credit_amount INTEGER DEFAULT 0 CHECK(credit_amount >= 0),
    online_amount INTEGER DEFAULT 0 CHECK(online_amount >= 0),
    transfer_image TEXT,
    FOREIGN KEY(staff_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    amount INTEGER NOT NULL CHECK(amount >= 0),
    remaining_amount INTEGER NOT NULL CHECK(remaining_amount >= 0),
    due_date DATE NOT NULL,
    status TEXT CHECK(status IN ('Active', 'Paid', 'Overdue')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    action_type TEXT NOT NULL,
    entity_id INTEGER,
    summary TEXT,
    user_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
  CREATE INDEX IF NOT EXISTS idx_loans_customer ON loans(customer_id);
`);

// Run migrations
migrateToCents();

// Audit Log Helper
const logAudit = (action: string, entityId: number | null, summary: string, userId: number | null) => {
  db.prepare(`
    INSERT INTO audit_logs (action_type, entity_id, summary, user_id)
    VALUES (?, ?, ?, ?)
  `).run(action, entityId, summary, userId);
};

// Daily Backup Logic
const backupDir = process.env.BACKUP_DIR || path.join(__dirname, 'backups');
fs.ensureDirSync(backupDir);

cron.schedule('0 0 * * *', async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `nexa-backup-${timestamp}.db`);
  try {
    await db.backup(backupPath);
    console.log(`Database backup created: ${backupPath}`);
  } catch (err) {
    console.error('Database backup failed:', err);
  }
});

// Migrations for existing tables
addColumnIfNotExists('users', 'plan', "TEXT DEFAULT 'Trial'");
addColumnIfNotExists('users', 'trial_end_date', 'DATETIME');
addColumnIfNotExists('users', 'subscription_status', "TEXT DEFAULT 'Active'");
addColumnIfNotExists('transactions', 'customer_id', 'INTEGER');
addColumnIfNotExists('transactions', 'product_type', 'TEXT');
addColumnIfNotExists('transactions', 'cash_amount', 'REAL DEFAULT 0');
addColumnIfNotExists('transactions', 'credit_amount', 'REAL DEFAULT 0');
addColumnIfNotExists('transactions', 'online_amount', 'REAL DEFAULT 0');
addColumnIfNotExists('transactions', 'transfer_image', 'TEXT');
addColumnIfNotExists('loans', 'customer_id', 'INTEGER');

// Seed default owner if not exists
const ownerExists = db.prepare("SELECT * FROM users WHERE role = 'Owner'").get();
if (!ownerExists) {
  db.prepare("INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)").run(
    "admin",
    "admin123",
    "Owner",
    "System Owner"
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy Safety
  app.set("trust proxy", 1);

  // Security Middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // Vite handles CSP in dev
  }));
  
  const isProd = process.env.NODE_ENV === "production";
  app.use(cors({
    origin: isProd ? [process.env.APP_URL!] : true,
    credentials: true
  }));
  app.use(express.json({ limit: '100kb' }));

  // Request Logging
  if (!isProd) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
  }

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." }
  });
  app.use("/api/", limiter);

  // Validation Schemas
  const signupSchema = z.object({
    username: z.string().min(3).max(50).trim(),
    password: z.string().min(6),
    full_name: z.string().min(2).max(100).trim(),
    plan: z.string().optional().nullable()
  }).strict();

  const loginSchema = z.object({
    username: z.string().trim(),
    password: z.string()
  }).strict();

  const subscribeSchema = z.object({
    userId: z.number(),
    plan: z.string()
  }).strict();

  const customerSchema = z.object({
    name: z.string().min(2).trim(),
    phone: z.string().optional().nullable()
  }).strict();

  const inventorySchema = z.object({
    name: z.string().min(1).trim(),
    sku: z.string().min(1).trim(),
    category: z.string().optional().nullable(),
    quantity: z.number().int().nonnegative(),
    unit_price: z.number().nonnegative(),
    cost_price: z.number().nonnegative(),
    min_stock_level: z.number().int().nonnegative()
  }).strict();

  const transactionSchema = z.object({
    type: z.enum(['Sale', 'Expense']),
    amount: z.number().nonnegative(),
    description: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    staff_id: z.number().optional().nullable(),
    customer_id: z.number().optional().nullable(),
    product_type: z.string().optional().nullable(),
    cash_amount: z.number().nonnegative().optional(),
    credit_amount: z.number().nonnegative().optional(),
    online_amount: z.number().nonnegative().optional(),
    transfer_image: z.string().optional().nullable(),
    inventory_items: z.array(z.object({
      id: z.number(),
      quantity: z.number().positive()
    })).optional()
  }).strict();

  const loanSchema = z.object({
    customer_id: z.number().int().positive(),
    amount: z.number().nonnegative(),
    due_date: z.string()
  }).strict();

  const staffSchema = z.object({
    username: z.string().min(3).trim(),
    password: z.string().min(6),
    role: z.enum(['Manager', 'Staff']),
    full_name: z.string().min(2).trim()
  }).strict();

  const changePasswordSchema = z.object({
    username: z.string().trim(),
    oldPassword: z.string(),
    newPassword: z.string().min(6)
  }).strict();

  const idParamSchema = z.object({
    id: z.string().regex(/^\d+$/).transform(Number)
  }).strict();

  const reportQuerySchema = z.object({
    period: z.enum(['daily', 'weekly', 'monthly']).optional()
  }).strict();

  const paymentWebhookSchema = z.object({
    userId: z.number(),
    status: z.enum(['active', 'past_due', 'canceled', 'trialing']),
    plan: z.string().optional(),
    transactionId: z.string().optional()
  }).strict();

  // Middleware to simulate user role
  app.use((req, res, next) => {
    const role = (req.headers['x-user-role'] as string) || 'Staff';
    const userId = req.headers['x-user-id'];
    (req as any).user = { 
      role, 
      id: userId ? parseInt(userId as string) : null 
    };
    next();
  });

  // Auth Routes
  app.post("/api/signup", (req, res, next) => {
    try {
      const { username, password, full_name, plan } = signupSchema.parse(req.body);
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 15);
      
      const info = db.prepare(`
        INSERT INTO users (username, password, role, full_name, plan, trial_end_date)
        VALUES (?, ?, 'Owner', ?, ?, ?)
      `).run(username, password, full_name, plan || null, trialEndDate.toISOString());
      
      const user = db.prepare("SELECT id, username, role, full_name, plan, trial_end_date FROM users WHERE id = ?").get(info.lastInsertRowid) as any;
      res.json(user);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: "Username already exists" });
      next(e);
    }
  });

  app.post("/api/login", (req, res, next) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = db.prepare("SELECT id, username, role, full_name, plan, trial_end_date FROM users WHERE username = ? AND password = ?").get(username, password) as any;
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      res.json(user);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.post("/api/subscribe", (req, res, next) => {
    try {
      const { userId, plan } = subscribeSchema.parse(req.body);
      db.prepare("UPDATE users SET plan = ?, subscription_status = 'Active' WHERE id = ?").run(plan, userId);
      const user = db.prepare("SELECT id, username, role, full_name, plan, trial_end_date FROM users WHERE id = ?").get(userId) as any;
      res.json(user);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  // API Routes
  app.get("/api/stats", (req, res, next) => {
    try {
      const sales = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'Sale'").get() as any;
      const expenses = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'Expense'").get() as any;
      const inventoryCount = db.prepare("SELECT COUNT(*) as count FROM inventory").get() as any;
      const activeLoans = db.prepare("SELECT SUM(remaining_amount) as total FROM loans WHERE status != 'Paid'").get() as any;

      res.json({
        totalSales: fromCents(sales?.total || 0),
        totalExpenses: fromCents(expenses?.total || 0),
        inventoryItems: inventoryCount?.count || 0,
        outstandingLoans: fromCents(activeLoans?.total || 0)
      });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/customers", (req, res, next) => {
    try {
      const list = db.prepare("SELECT * FROM customers ORDER BY name ASC").all();
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/customers", (req, res, next) => {
    try {
      const { name, phone } = customerSchema.parse(req.body);
      const info = db.prepare("INSERT INTO customers (name, phone) VALUES (?, ?)").run(name, phone);
      res.json({ id: info.lastInsertRowid });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.get("/api/inventory", (req, res, next) => {
    try {
      const items = db.prepare("SELECT * FROM inventory").all() as any[];
      res.json(items.map(item => ({
        ...item,
        unit_price: fromCents(item.unit_price),
        cost_price: fromCents(item.cost_price)
      })));
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/inventory", (req, res, next) => {
    const mutation = db.transaction((data: any) => {
      const info = db.prepare(`
        INSERT INTO inventory (name, sku, category, quantity, unit_price, cost_price, min_stock_level)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(data.name, data.sku, data.category, data.quantity, toCents(data.unit_price), toCents(data.cost_price), data.min_stock_level);
      
      logAudit('inventory_create', Number(info.lastInsertRowid), `Created item ${data.name}`, (req as any).user.id);
      return info.lastInsertRowid;
    });

    try {
      const data = inventorySchema.parse(req.body);
      const id = mutation(data);
      res.json({ id });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: "SKU already exists" });
      next(e);
    }
  });

  app.put("/api/inventory/:id", (req, res, next) => {
    const mutation = db.transaction((id: number, data: any) => {
      const existing = db.prepare("SELECT * FROM inventory WHERE id = ?").get(id) as any;
      if (!existing) throw new Error("Item not found");

      db.prepare(`
        UPDATE inventory SET 
          name = COALESCE(?, name), 
          quantity = COALESCE(?, quantity), 
          unit_price = COALESCE(?, unit_price), 
          cost_price = COALESCE(?, cost_price), 
          min_stock_level = COALESCE(?, min_stock_level)
        WHERE id = ?
      `).run(
        data.name, 
        data.quantity, 
        data.unit_price !== undefined ? toCents(data.unit_price) : null, 
        data.cost_price !== undefined ? toCents(data.cost_price) : null, 
        data.min_stock_level, 
        id
      );

      logAudit('inventory_update', id, `Updated item ${data.name || existing.name}`, (req as any).user.id);
    });

    try {
      if ((req as any).user.role !== 'Owner') return res.status(403).json({ error: "Unauthorized" });
      const { id } = idParamSchema.parse(req.params);
      const data = inventorySchema.partial().parse(req.body);
      
      mutation(id, data);
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.get("/api/transactions", (req, res, next) => {
    try {
      const list = db.prepare(`
        SELECT t.*, c.name as customer_name 
        FROM transactions t 
        LEFT JOIN customers c ON t.customer_id = c.id 
        ORDER BY date DESC LIMIT 50
      `).all() as any[];
      
      res.json(list.map(tx => ({
        ...tx,
        amount: fromCents(tx.amount),
        cash_amount: fromCents(tx.cash_amount),
        credit_amount: fromCents(tx.credit_amount),
        online_amount: fromCents(tx.online_amount)
      })));
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/transactions", (req, res, next) => {
    const mutation = db.transaction((data: any) => {
      // 1. Record Transaction
      const info = db.prepare(`
        INSERT INTO transactions (type, amount, description, category, staff_id, customer_id, product_type, cash_amount, credit_amount, online_amount, transfer_image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.type, toCents(data.amount), data.description, data.category, 
        data.staff_id, data.customer_id, data.product_type, 
        toCents(data.cash_amount), toCents(data.credit_amount), toCents(data.online_amount), 
        data.transfer_image || null
      );

      const txId = Number(info.lastInsertRowid);

      // 2. Deduct Stock if Sale
      if (data.type === 'Sale' && data.inventory_items) {
        for (const item of data.inventory_items) {
          const result = db.prepare("UPDATE inventory SET quantity = quantity - ? WHERE id = ? AND quantity >= ?").run(item.quantity, item.id, item.quantity);
          if (result.changes === 0) {
            throw new Error(`Insufficient stock for item ID ${item.id}`);
          }
          logAudit('stock_deduction', item.id, `Deducted ${item.quantity} for sale ${txId}`, (req as any).user.id);
        }
      }

      // 3. Update Loan if Credit Sale
      if (data.type === 'Sale' && data.credit_amount > 0 && data.customer_id) {
        const loanAmount = toCents(data.credit_amount);
        db.prepare(`
          INSERT INTO loans (customer_id, amount, remaining_amount, due_date, status)
          VALUES (?, ?, ?, date('now', '+30 days'), 'Active')
        `).run(data.customer_id, loanAmount, loanAmount);
        logAudit('loan_creation', data.customer_id, `Created loan for sale ${txId}`, (req as any).user.id);
      }

      logAudit('transaction_create', txId, `Created ${data.type} of ${data.amount}`, (req as any).user.id);
      return txId;
    });

    try {
      const data = transactionSchema.parse(req.body);
      const id = mutation(data);
      res.json({ id });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.get("/api/loans", (req, res, next) => {
    try {
      const list = db.prepare(`
        SELECT l.*, c.name as borrower_name, c.phone as borrower_phone 
        FROM loans l 
        JOIN customers c ON l.customer_id = c.id 
        ORDER BY created_at DESC
      `).all() as any[];
      
      res.json(list.map(loan => ({
        ...loan,
        amount: fromCents(loan.amount),
        remaining_amount: fromCents(loan.remaining_amount)
      })));
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/loans", (req, res, next) => {
    const mutation = db.transaction((data: any) => {
      const amountCents = toCents(data.amount);
      const info = db.prepare(`
        INSERT INTO loans (customer_id, amount, remaining_amount, due_date, status)
        VALUES (?, ?, ?, ?, 'Active')
      `).run(data.customer_id, amountCents, amountCents, data.due_date);
      
      logAudit('loan_create', Number(info.lastInsertRowid), `Created loan of ${data.amount}`, (req as any).user.id);
      return info.lastInsertRowid;
    });

    try {
      const data = loanSchema.parse(req.body);
      const id = mutation(data);
      res.json({ id });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.delete("/api/loans/:id", (req, res, next) => {
    try {
      if ((req as any).user.role !== 'Owner') return res.status(403).json({ error: "Unauthorized" });
      const { id } = idParamSchema.parse(req.params);
      db.prepare("DELETE FROM loans WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.delete("/api/inventory/:id", (req, res, next) => {
    try {
      if ((req as any).user.role !== 'Owner') return res.status(403).json({ error: "Unauthorized" });
      const { id } = idParamSchema.parse(req.params);
      db.prepare("DELETE FROM inventory WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.delete("/api/customers/:id", (req, res, next) => {
    try {
      if ((req as any).user.role !== 'Owner') return res.status(403).json({ error: "Unauthorized" });
      const { id } = idParamSchema.parse(req.params);
      db.prepare("DELETE FROM customers WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.get("/api/staff", (req, res, next) => {
    try {
      if ((req as any).user.role !== 'Owner') return res.status(403).json({ error: "Unauthorized" });
      const list = db.prepare("SELECT id, username, role, full_name FROM users WHERE role != 'Owner'").all();
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/staff", (req, res, next) => {
    try {
      if ((req as any).user.role !== 'Owner') return res.status(403).json({ error: "Unauthorized" });
      const { username, password, role, full_name } = staffSchema.parse(req.body);
      const info = db.prepare("INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)").run(username, password, role, full_name);
      res.json({ id: info.lastInsertRowid });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: "Username already exists" });
      next(e);
    }
  });

  app.delete("/api/staff/:id", (req, res, next) => {
    try {
      if ((req as any).user.role !== 'Owner') return res.status(403).json({ error: "Unauthorized" });
      const { id } = idParamSchema.parse(req.params);
      db.prepare("DELETE FROM users WHERE id = ? AND role != 'Owner'").run(id);
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.post("/api/change-password", (req, res, next) => {
    try {
      const { username, oldPassword, newPassword } = changePasswordSchema.parse(req.body);
      const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, oldPassword) as any;
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(newPassword, user.id);
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  // Payment Webhook Endpoint
  app.post("/api/webhooks/payment", (req, res, next) => {
    const secret = req.headers['x-webhook-secret'];
    const expectedSecret = process.env.PAYMENT_WEBHOOK_SECRET;

    if (process.env.NODE_ENV === "production" && (!secret || secret !== expectedSecret)) {
      return res.status(401).json({ error: "Unauthorized webhook request" });
    }

    const mutation = db.transaction((data: any) => {
      const user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(data.userId) as any;
      if (!user) throw new Error("User not found for webhook");

      db.prepare(`
        UPDATE users 
        SET subscription_status = ?, 
            plan = COALESCE(?, plan)
        WHERE id = ?
      `).run(data.status, data.plan || null, data.userId);

      logAudit('payment_webhook', data.userId, `Payment status updated to ${data.status} for user ${user.username}. TX: ${data.transactionId || 'N/A'}`, null);
    });

    try {
      const data = paymentWebhookSchema.parse(req.body);
      mutation(data);
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.get("/api/reports", (req, res, next) => {
    try {
      if ((req as any).user.role !== 'Owner') return res.status(403).json({ error: "Unauthorized" });
      const { period } = reportQuerySchema.parse(req.query);
      
      let dateFilter = "";
      if (period === 'daily') {
        dateFilter = "date >= date('now', 'start of day')";
      } else if (period === 'weekly') {
        dateFilter = "date >= date('now', '-7 days')";
      } else if (period === 'monthly') {
        dateFilter = "date >= date('now', 'start of month')";
      } else {
        dateFilter = "1=1";
      }

      const transactions = db.prepare(`
        SELECT t.*, c.name as customer_name 
        FROM transactions t 
        LEFT JOIN customers c ON t.customer_id = c.id 
        WHERE ${dateFilter}
        ORDER BY date DESC
      `).all() as any[];

      const summary = db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'Sale' THEN amount ELSE 0 END) as totalSales,
          SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END) as totalExpenses
        FROM transactions
        WHERE ${dateFilter}
      `).get() as any;

      res.json({
        summary: {
          totalSales: fromCents(summary?.totalSales || 0),
          totalExpenses: fromCents(summary?.totalExpenses || 0),
          netProfit: fromCents((summary?.totalSales || 0) - (summary?.totalExpenses || 0))
        },
        transactions: transactions.map(tx => ({
          ...tx,
          amount: fromCents(tx.amount),
          cash_amount: fromCents(tx.cash_amount),
          credit_amount: fromCents(tx.credit_amount),
          online_amount: fromCents(tx.online_amount)
        }))
      });
    } catch (e) {
      next(e);
    }
  });

  // Centralized Error Handling Middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV !== "production") {
      console.error(err.stack);
    }
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ 
      error: message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
