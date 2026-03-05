import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { google } from "googleapis";
import crypto from "crypto";
import { Readable } from "stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment Variable Validation
const requiredEnv = ["NODE_ENV"];
requiredEnv.forEach(env => {
  if (!process.env[env]) {
    throw new Error(`Critical Error: ${env} environment variable is not set.`);
  }
});

const db = new Database("nexa.db");
db.pragma('foreign_keys = ON');

// Token Encryption Helpers
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'adera_token_secret_32_chars_long'; // Must be 32 chars
const IV_LENGTH = 16;

function encryptToken(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptToken(text: string) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Google OAuth Client Helper
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID || 'mock_id',
  process.env.GOOGLE_CLIENT_SECRET || 'mock_secret',
  `${process.env.APP_URL || 'http://localhost:3000'}/auth/google/callback`
);

async function getDriveClient(accountId: number) {
  const config = db.prepare("SELECT * FROM cloud_configs WHERE account_id = ?").get(accountId) as any;
  if (!config || !config.refresh_token) return null;

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/auth/google/callback`
  );

  client.setCredentials({
    refresh_token: decryptToken(config.refresh_token)
  });

  return google.drive({ version: 'v3', auth: client });
}

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

// Initialize Database with constraints
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    account_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    plan TEXT CHECK(plan IN ('trial', 'basic', 'pro')) NOT NULL,
    status TEXT CHECK(status IN ('trial', 'active', 'past_due', 'cancelled')) NOT NULL,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('Owner', 'Manager', 'Staff')) NOT NULL,
    full_name TEXT NOT NULL,
    plan TEXT DEFAULT 'Trial',
    trial_end_date DATETIME,
    subscription_status TEXT DEFAULT 'Active',
    account_id INTEGER,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    account_id INTEGER NOT NULL,
    shop_id INTEGER,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY(shop_id) REFERENCES shops(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    category TEXT,
    quantity INTEGER DEFAULT 0 CHECK(quantity >= 0),
    unit_price REAL DEFAULT 0 CHECK(unit_price >= 0),
    cost_price REAL DEFAULT 0 CHECK(cost_price >= 0),
    min_stock_level INTEGER DEFAULT 5 CHECK(min_stock_level >= 0),
    account_id INTEGER NOT NULL,
    shop_id INTEGER,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY(shop_id) REFERENCES shops(id) ON DELETE SET NULL,
    UNIQUE(sku, account_id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT CHECK(type IN ('Sale', 'Expense')) NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    description TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    category TEXT,
    staff_id INTEGER,
    customer_id INTEGER,
    product_type TEXT,
    cash_amount REAL DEFAULT 0 CHECK(cash_amount >= 0),
    credit_amount REAL DEFAULT 0 CHECK(credit_amount >= 0),
    online_amount REAL DEFAULT 0 CHECK(online_amount >= 0),
    transfer_image TEXT,
    account_id INTEGER NOT NULL,
    shop_id INTEGER,
    FOREIGN KEY(staff_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY(shop_id) REFERENCES shops(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    remaining_amount REAL NOT NULL CHECK(remaining_amount >= 0),
    due_date DATE NOT NULL,
    status TEXT CHECK(status IN ('Active', 'Paid', 'Overdue')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    account_id INTEGER NOT NULL,
    shop_id INTEGER,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY(shop_id) REFERENCES shops(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS cloud_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL UNIQUE,
    provider TEXT,
    access_token TEXT,
    refresh_token TEXT,
    e2ee_enabled INTEGER DEFAULT 0,
    e2ee_key TEXT,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
  );
`);

// Migrations for existing tables
addColumnIfNotExists('users', 'plan', "TEXT DEFAULT 'Trial'");
addColumnIfNotExists('users', 'trial_end_date', 'DATETIME');
addColumnIfNotExists('users', 'subscription_status', "TEXT DEFAULT 'Active'");
addColumnIfNotExists('users', 'account_id', 'INTEGER');
addColumnIfNotExists('customers', 'account_id', 'INTEGER');
addColumnIfNotExists('inventory', 'account_id', 'INTEGER');
addColumnIfNotExists('transactions', 'account_id', 'INTEGER');
addColumnIfNotExists('loans', 'account_id', 'INTEGER');
addColumnIfNotExists('transactions', 'customer_id', 'INTEGER');
addColumnIfNotExists('transactions', 'product_type', 'TEXT');
addColumnIfNotExists('transactions', 'cash_amount', 'REAL DEFAULT 0');
addColumnIfNotExists('transactions', 'credit_amount', 'REAL DEFAULT 0');
addColumnIfNotExists('transactions', 'online_amount', 'REAL DEFAULT 0');
addColumnIfNotExists('transactions', 'transfer_image', 'TEXT');
addColumnIfNotExists('loans', 'customer_id', 'INTEGER');
addColumnIfNotExists('users', 'shop_id', 'INTEGER');
addColumnIfNotExists('customers', 'shop_id', 'INTEGER');
addColumnIfNotExists('inventory', 'shop_id', 'INTEGER');
addColumnIfNotExists('transactions', 'shop_id', 'INTEGER');
addColumnIfNotExists('loans', 'shop_id', 'INTEGER');

// Seed default owner if not exists
const ownerExists = db.prepare("SELECT * FROM users WHERE role = 'Owner'").get();
if (!ownerExists) {
  const accountInfo = db.prepare("INSERT INTO accounts (name) VALUES (?)").run("System Account");
  const accountId = accountInfo.lastInsertRowid;

  const shopInfo = db.prepare("INSERT INTO shops (name, account_id) VALUES (?, ?)").run("Main Shop", accountId);
  const shopId = shopInfo.lastInsertRowid;
  
  db.prepare("INSERT INTO users (username, password, role, full_name, account_id, shop_id) VALUES (?, ?, ?, ?, ?, ?)").run(
    "admin",
    "admin123",
    "Owner",
    "System Owner",
    accountId,
    shopId
  );

  db.prepare("INSERT INTO subscriptions (account_id, plan, status) VALUES (?, 'pro', 'active')").run(accountId);
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
    origin: isProd ? [process.env.APP_URL || ''] : true,
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));

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
    plan: z.enum(['trial', 'basic', 'pro'])
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

  const shopSchema = z.object({
    name: z.string().min(2).trim()
  }).strict();

  const idParamSchema = z.object({
    id: z.string().regex(/^\d+$/).transform(Number)
  }).strict();

  const reportQuerySchema = z.object({
    period: z.enum(['daily', 'weekly', 'monthly']).optional()
  }).strict();

  // Middleware to simulate user role
  app.use((req, res, next) => {
    const role = (req.headers['x-user-role'] as string) || 'Staff';
    const userId = req.headers['x-user-id'];
    const id = userId ? parseInt(userId as string) : null;
    
    let accountId = null;
    let shopId = null;
    if (id) {
      const user = db.prepare("SELECT account_id, shop_id FROM users WHERE id = ?").get(id) as any;
      accountId = user?.account_id;
      shopId = user?.shop_id;
    }

    (req as any).user = { 
      role, 
      id,
      accountId,
      shopId
    };
    next();
  });

  // Subscription & Limits Middleware
  const checkSubscription = (req: Request, res: Response, next: NextFunction) => {
    const isTestMode = process.env.TEST_MODE === 'true';

    // Skip for non-write operations
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    // Skip for auth/subscribe routes
    if (req.path.startsWith('/api/signup') || req.path.startsWith('/api/login') || req.path.startsWith('/api/subscribe') || req.path.startsWith('/api/webhook')) return next();

    const { accountId, shopId } = (req as any).user;
    if (!accountId) return res.status(401).json({ error: "Unauthorized" });

    const sub = db.prepare("SELECT status, plan FROM subscriptions WHERE account_id = ?").get(accountId) as any;
    
    // In TEST_MODE, we still log or attach sub data but don't block
    if (isTestMode) {
      (req as any).subscription = sub || { status: 'active', plan: 'pro' };
      return next();
    }

    if (!sub) return res.status(403).json({ error: "No active subscription found" });

    if (sub.status === 'trial' || sub.status === 'active') {
      // Downgrade Lock Logic: If Basic, only allow writing to the first shop
      if (sub.plan === 'basic' && shopId) {
        const primaryShop = db.prepare("SELECT id FROM shops WHERE account_id = ? ORDER BY id ASC LIMIT 1").get(accountId) as any;
        if (primaryShop && shopId !== primaryShop.id) {
          return res.status(403).json({ 
            error: "Shop locked (Read-only)", 
            message: "Your current plan (Basic) only supports 1 active shop. This shop is read-only. Please switch to your primary shop or upgrade to Pro." 
          });
        }
      }

      (req as any).subscription = sub;
      return next();
    }

    res.status(403).json({ 
      error: "Subscription inactive", 
      status: sub.status,
      message: "Please renew your subscription to perform write operations."
    });
  };

  app.use("/api/", checkSubscription);

  // Auth Routes
  app.post("/api/signup", (req, res, next) => {
    const signupTransaction = db.transaction((data: any) => {
      const { username, password, full_name, plan } = data;
      
      // 1. Create Account
      const accountInfo = db.prepare("INSERT INTO accounts (name) VALUES (?)").run(`${full_name}'s Account`);
      const accountId = accountInfo.lastInsertRowid;

      // 1.5 Create Default Shop
      const shopInfo = db.prepare("INSERT INTO shops (name, account_id) VALUES (?, ?)").run("Default Shop", accountId);
      const shopId = shopInfo.lastInsertRowid;

      // 2. Create User
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 15);
      
      const userInfo = db.prepare(`
        INSERT INTO users (username, password, role, full_name, plan, trial_end_date, account_id, shop_id)
        VALUES (?, ?, 'Owner', ?, ?, ?, ?, ?)
      `).run(username, password, full_name, plan || 'trial', trialEndDate.toISOString(), accountId, shopId);
      
      // 3. Create initial subscription
      db.prepare("INSERT INTO subscriptions (account_id, plan, status, end_date) VALUES (?, 'trial', 'trial', ?)").run(accountId, trialEndDate.toISOString());
      
      return userInfo.lastInsertRowid;
    });

    try {
      const data = signupSchema.parse(req.body);
      const userId = signupTransaction(data);
      
      const user = db.prepare("SELECT id, username, role, full_name, plan, trial_end_date, account_id FROM users WHERE id = ?").get(userId) as any;
      res.json(user);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: "Username already exists" });
      next(e);
    }
  });

  app.post("/api/login", (req, res, next) => {
    try {
      const isTestMode = process.env.TEST_MODE === 'true';
      const { username, password } = loginSchema.parse(req.body);
      const user = db.prepare("SELECT id, username, role, full_name, plan, trial_end_date, account_id FROM users WHERE username = ? AND password = ?").get(username, password) as any;
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      // Downgrade Lock Logic: If Basic, only allow login for the first 2 users
      if (user.account_id && !isTestMode) {
        const sub = db.prepare("SELECT plan FROM subscriptions WHERE account_id = ?").get(user.account_id) as any;
        if (sub && sub.plan === 'basic') {
          const allowedUsers = db.prepare("SELECT id FROM users WHERE account_id = ? ORDER BY id ASC LIMIT 2").all(user.account_id) as any[];
          const isAllowed = allowedUsers.some(u => u.id === user.id);
          if (!isAllowed) {
            return res.status(403).json({ 
              error: "Login disabled", 
              message: "Your current plan (Basic) only supports 2 active users. This user account is currently disabled. Please upgrade to Pro to enable more users." 
            });
          }
        }
      }

      res.json(user);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.post("/api/subscribe", (req, res, next) => {
    const subscribeTransaction = db.transaction((data: any) => {
      const { userId, plan } = data;
      const user = db.prepare("SELECT account_id FROM users WHERE id = ?").get(userId) as any;
      if (!user || !user.account_id) throw new Error("User or account not found");

      // Update user
      db.prepare("UPDATE users SET plan = ?, subscription_status = 'Active' WHERE id = ?").run(plan, userId);

      // Update or Insert subscription for the account
      const existingSub = db.prepare("SELECT id FROM subscriptions WHERE account_id = ?").get(user.account_id);
      if (existingSub) {
        db.prepare("UPDATE subscriptions SET plan = ?, status = 'active' WHERE account_id = ?").run(plan, user.account_id);
      } else {
        db.prepare("INSERT INTO subscriptions (account_id, plan, status) VALUES (?, ?, 'active')").run(user.account_id, plan);
      }
      
      return userId;
    });

    try {
      const data = subscribeSchema.parse(req.body);
      subscribeTransaction(data);
      const user = db.prepare("SELECT id, username, role, full_name, plan, trial_end_date, account_id FROM users WHERE id = ?").get(data.userId) as any;
      res.json(user);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  // API Routes
  app.get("/api/shops", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      const list = db.prepare("SELECT * FROM shops WHERE account_id = ?").all(accountId);
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/shops", (req, res, next) => {
    try {
      const { accountId } = (req as any).user;
      const sub = (req as any).subscription;

      if (sub.plan === 'basic') {
        const count = db.prepare("SELECT COUNT(*) as count FROM shops WHERE account_id = ?").get(accountId) as any;
        if (count.count >= 1) {
          return res.status(403).json({ error: "Shop limit reached for Basic plan (max 1 shop)" });
        }
      }

      const { name } = shopSchema.parse(req.body);
      const info = db.prepare("INSERT INTO shops (name, account_id) VALUES (?, ?)").run(name, accountId);
      res.json({ id: info.lastInsertRowid });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.get("/api/stats", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });

      const sales = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'Sale' AND account_id = ?").get(accountId) as any;
      const expenses = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'Expense' AND account_id = ?").get(accountId) as any;
      const inventoryCount = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE account_id = ?").get(accountId) as any;
      const activeLoans = db.prepare("SELECT SUM(remaining_amount) as total FROM loans WHERE status != 'Paid' AND account_id = ?").get(accountId) as any;

      res.json({
        totalSales: sales?.total || 0,
        totalExpenses: expenses?.total || 0,
        inventoryItems: inventoryCount?.count || 0,
        outstandingLoans: activeLoans?.total || 0
      });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/customers", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      const list = db.prepare("SELECT * FROM customers WHERE account_id = ? ORDER BY name ASC").all(accountId);
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/customers", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      const { name, phone } = customerSchema.parse(req.body);
      const info = db.prepare("INSERT INTO customers (name, phone, account_id) VALUES (?, ?, ?)").run(name, phone, accountId);
      res.json({ id: info.lastInsertRowid });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.get("/api/inventory", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      const items = db.prepare("SELECT * FROM inventory WHERE account_id = ?").all(accountId);
      res.json(items);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/inventory", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      const data = inventorySchema.parse(req.body);
      const info = db.prepare(`
        INSERT INTO inventory (name, sku, category, quantity, unit_price, cost_price, min_stock_level, account_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(data.name, data.sku, data.category, data.quantity, data.unit_price, data.cost_price, data.min_stock_level, accountId);
      res.json({ id: info.lastInsertRowid });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: "SKU already exists" });
      next(e);
    }
  });

  app.put("/api/inventory/:id", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      if ((req as any).user.role !== 'Owner') return res.status(403).json({ error: "Unauthorized" });
      const { id } = idParamSchema.parse(req.params);
      const data = inventorySchema.partial().parse(req.body);
      
      const existing = db.prepare("SELECT * FROM inventory WHERE id = ? AND account_id = ?").get(id, accountId);
      if (!existing) return res.status(404).json({ error: "Item not found" });

      db.prepare(`
        UPDATE inventory SET 
          name = COALESCE(?, name), 
          quantity = COALESCE(?, quantity), 
          unit_price = COALESCE(?, unit_price), 
          cost_price = COALESCE(?, cost_price), 
          min_stock_level = COALESCE(?, min_stock_level)
        WHERE id = ? AND account_id = ?
      `).run(data.name, data.quantity, data.unit_price, data.cost_price, data.min_stock_level, id, accountId);
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.get("/api/transactions/:id/receipt", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      const { id } = idParamSchema.parse(req.params);
      
      const transaction = db.prepare(`
        SELECT t.*, c.name as customer_name, c.phone as customer_phone, s.name as shop_name
        FROM transactions t
        LEFT JOIN customers c ON t.customer_id = c.id
        LEFT JOIN shops s ON t.shop_id = s.id
        WHERE t.id = ? AND t.account_id = ?
      `).get(id, accountId) as any;

      if (!transaction) return res.status(404).json({ error: "Transaction not found" });
      
      res.json(transaction);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/transactions", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      const list = db.prepare(`
        SELECT t.*, c.name as customer_name 
        FROM transactions t 
        LEFT JOIN customers c ON t.customer_id = c.id 
        WHERE t.account_id = ?
        ORDER BY date DESC LIMIT 50
      `).all(accountId);
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/transactions", (req, res, next) => {
    const accountId = (req as any).user.accountId;
    if (!accountId) return res.status(401).json({ error: "Unauthorized" });

    const transaction = db.transaction((data: any) => {
      // 1. Record Transaction
      const info = db.prepare(`
        INSERT INTO transactions (type, amount, description, category, staff_id, customer_id, product_type, cash_amount, credit_amount, online_amount, transfer_image, account_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.type, data.amount, data.description, data.category, 
        data.staff_id, data.customer_id, data.product_type, 
        data.cash_amount || 0, data.credit_amount || 0, data.online_amount || 0, 
        data.transfer_image || null, accountId
      );

      // 2. Deduct Stock if Sale
      if (data.type === 'Sale' && data.inventory_items) {
        for (const item of data.inventory_items) {
          const result = db.prepare("UPDATE inventory SET quantity = quantity - ? WHERE id = ? AND account_id = ? AND quantity >= ?").run(item.quantity, item.id, accountId, item.quantity);
          if (result.changes === 0) {
            throw new Error(`Insufficient stock for item ID ${item.id}`);
          }
        }
      }

      // 3. Update Loan if Credit Sale
      if (data.type === 'Sale' && data.credit_amount > 0 && data.customer_id) {
        db.prepare(`
          INSERT INTO loans (customer_id, amount, remaining_amount, due_date, status, account_id)
          VALUES (?, ?, ?, date('now', '+30 days'), 'Active', ?)
        `).run(data.customer_id, data.credit_amount, data.credit_amount, accountId);
      }

      return info.lastInsertRowid;
    });

    try {
      const data = transactionSchema.parse(req.body);
      const id = transaction(data);
      res.json({ id });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.get("/api/loans", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      const list = db.prepare(`
        SELECT l.*, c.name as borrower_name, c.phone as borrower_phone 
        FROM loans l 
        JOIN customers c ON l.customer_id = c.id 
        WHERE l.account_id = ?
        ORDER BY created_at DESC
      `).all(accountId);
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/loans", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      const { customer_id, amount, due_date } = loanSchema.parse(req.body);
      const info = db.prepare(`
        INSERT INTO loans (customer_id, amount, remaining_amount, due_date, status, account_id)
        VALUES (?, ?, ?, ?, 'Active', ?)
      `).run(customer_id, amount, amount, due_date, accountId);
      res.json({ id: info.lastInsertRowid });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.post("/api/loans/:id/payment", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      const { id } = idParamSchema.parse(req.params);
      const { amount } = z.object({ amount: z.number().positive() }).parse(req.body);

      const loan = db.prepare("SELECT * FROM loans WHERE id = ? AND account_id = ?").get(id, accountId) as any;
      if (!loan) return res.status(404).json({ error: "Loan not found" });

      const newRemaining = Math.max(0, loan.remaining_amount - amount);
      const newStatus = newRemaining === 0 ? 'Paid' : 'Active';

      db.prepare("UPDATE loans SET remaining_amount = ?, status = ? WHERE id = ?").run(newRemaining, newStatus, id);
      
      db.prepare(`
        INSERT INTO transactions (type, amount, description, account_id, customer_id)
        VALUES ('Sale', ?, ?, ?, ?)
      `).run(amount, `Loan payment from customer ${loan.customer_id}`, accountId, loan.customer_id);

      res.json({ success: true, remaining_amount: newRemaining });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.delete("/api/loans/:id", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      if ((req as any).user.role !== 'Owner') return res.status(403).json({ error: "Unauthorized" });
      const { id } = idParamSchema.parse(req.params);
      db.prepare("DELETE FROM loans WHERE id = ? AND account_id = ?").run(id, accountId);
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.delete("/api/inventory/:id", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      if ((req as any).user.role !== 'Owner') return res.status(403).json({ error: "Unauthorized" });
      const { id } = idParamSchema.parse(req.params);
      db.prepare("DELETE FROM inventory WHERE id = ? AND account_id = ?").run(id, accountId);
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.post("/api/inventory/import", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      
      const { items } = z.object({
        items: z.array(z.object({
          name: z.string(),
          sku: z.string(),
          quantity: z.number(),
          unit_price: z.number(),
          cost_price: z.number(),
          category: z.string().optional()
        }))
      }).parse(req.body);

      const insert = db.prepare(`
        INSERT INTO inventory (name, sku, quantity, unit_price, cost_price, category, account_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const importTransaction = db.transaction((items: any[]) => {
        for (const item of items) {
          insert.run(item.name, item.sku, item.quantity, item.unit_price, item.cost_price, item.category || 'General', accountId);
        }
      });

      importTransaction(items);
      res.json({ success: true, count: items.length });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.delete("/api/customers/:id", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      if ((req as any).user.role !== 'Owner') return res.status(403).json({ error: "Unauthorized" });
      const { id } = idParamSchema.parse(req.params);
      db.prepare("DELETE FROM customers WHERE id = ? AND account_id = ?").run(id, accountId);
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.put("/api/customers/:id", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      if ((req as any).user.role !== 'Owner') return res.status(403).json({ error: "Unauthorized" });
      const { id } = idParamSchema.parse(req.params);
      const data = customerSchema.partial().parse(req.body);
      
      db.prepare(`
        UPDATE customers SET 
          name = COALESCE(?, name), 
          phone = COALESCE(?, phone)
        WHERE id = ? AND account_id = ?
      `).run(data.name, data.phone, id, accountId);
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  app.get("/api/staff", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      if ((req as any).user.role !== 'Owner') return res.status(403).json({ error: "Unauthorized" });
      const list = db.prepare("SELECT id, username, role, full_name FROM users WHERE role != 'Owner' AND account_id = ?").all(accountId);
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/staff", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      if ((req as any).user.role !== 'Owner') return res.status(403).json({ error: "Unauthorized" });

      const sub = (req as any).subscription;
      if (sub.plan === 'basic') {
        const count = db.prepare("SELECT COUNT(*) as count FROM users WHERE account_id = ?").get(accountId) as any;
        if (count.count >= 2) {
          return res.status(403).json({ error: "User limit reached for Basic plan (max 2 users)" });
        }
      }

      const { username, password, role, full_name } = staffSchema.parse(req.body);
      const info = db.prepare("INSERT INTO users (username, password, role, full_name, account_id) VALUES (?, ?, ?, ?, ?)").run(username, password, role, full_name, accountId);
      res.json({ id: info.lastInsertRowid });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: "Username already exists" });
      next(e);
    }
  });

  app.delete("/api/staff/:id", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      if ((req as any).user.role !== 'Owner') return res.status(403).json({ error: "Unauthorized" });
      const { id } = idParamSchema.parse(req.params);
      db.prepare("DELETE FROM users WHERE id = ? AND role != 'Owner' AND account_id = ?").run(id, accountId);
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

  app.get("/api/reports", (req, res, next) => {
    try {
      const accountId = (req as any).user.accountId;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
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
        WHERE ${dateFilter} AND t.account_id = ?
        ORDER BY date DESC
      `).all(accountId) as any[];

      const summary = db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'Sale' THEN amount ELSE 0 END) as totalSales,
          SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END) as totalExpenses
        FROM transactions
        WHERE ${dateFilter} AND account_id = ?
      `).get(accountId) as any;

      res.json({
        summary: {
          totalSales: summary?.totalSales || 0,
          totalExpenses: summary?.totalExpenses || 0,
          netProfit: (summary?.totalSales || 0) - (summary?.totalExpenses || 0)
        },
        transactions
      });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/me", (req, res, next) => {
    try {
      const userId = (req as any).user.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const user = db.prepare("SELECT id, username, role, full_name, plan, trial_end_date, account_id, shop_id FROM users WHERE id = ?").get(userId) as any;
      res.json(user);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/shops/switch", (req, res, next) => {
    try {
      const userId = (req as any).user.id;
      const { shopId } = z.object({ shopId: z.number() }).parse(req.body);
      
      const shop = db.prepare("SELECT id FROM shops WHERE id = ? AND account_id = (SELECT account_id FROM users WHERE id = ?)").get(shopId, userId);
      if (!shop) return res.status(403).json({ error: "Unauthorized to switch to this shop" });

      db.prepare("UPDATE users SET shop_id = ? WHERE id = ?").run(shopId, userId);
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  // Cloud Storage Routes
  app.get("/api/cloud/config", (req, res, next) => {
    try {
      const { accountId } = (req as any).user;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });
      
      const config = db.prepare("SELECT provider, e2ee_enabled FROM cloud_configs WHERE account_id = ?").get(accountId) as any;
      res.json(config || { provider: null, e2ee_enabled: 0 });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/cloud/files", async (req, res, next) => {
    try {
      const { accountId } = (req as any).user;
      if (!accountId) return res.status(401).json({ error: "Unauthorized" });

      const drive = await getDriveClient(accountId);
      if (!drive) return res.json([]);

      const response = await drive.files.list({
        q: "trashed = false",
        fields: 'files(id, name, webViewLink, mimeType, size, createdTime)',
        spaces: 'drive',
      });

      res.json(response.data.files || []);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/cloud/files/:id/content", async (req, res, next) => {
    try {
      const { accountId } = (req as any).user;
      const { id } = z.object({ id: z.string() }).parse(req.params);
      const drive = await getDriveClient(accountId);
      if (!drive) return res.status(400).json({ error: "Cloud storage not linked" });

      const response = await drive.files.get({
        fileId: id,
        alt: 'media'
      }, { responseType: 'arraybuffer' });

      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(Buffer.from(response.data as any));
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/upload", async (req, res, next) => {
    try {
      const { accountId } = (req as any).user;
      const drive = await getDriveClient(accountId);
      if (!drive) return res.status(400).json({ error: "Cloud storage not linked" });

      const { name, data, type } = z.object({
        name: z.string(),
        data: z.string(), // base64
        type: z.string()
      }).parse(req.body);

      const buffer = Buffer.from(data.split(',')[1] || data, 'base64');
      
      const response = await drive.files.create({
        requestBody: {
          name: name,
          mimeType: type,
        },
        media: {
          mimeType: type,
          body: Readable.from(buffer)
        },
      } as any);

      res.json({ success: true, fileId: response.data.id });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/auth/google/url", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file'],
      prompt: 'consent',
      state: (req as any).user.accountId.toString()
    });
    res.json({ url });
  });

  app.get("/auth/google/callback", async (req, res, next) => {
    try {
      const { code, state } = req.query;
      const accountId = parseInt(state as string);

      const { tokens } = await oauth2Client.getToken(code as string);
      
      if (tokens.refresh_token) {
        const encryptedRefresh = encryptToken(tokens.refresh_token);
        
        const existing = db.prepare("SELECT id FROM cloud_configs WHERE account_id = ?").get(accountId);
        if (existing) {
          db.prepare("UPDATE cloud_configs SET provider = 'Google Drive', refresh_token = ? WHERE account_id = ?").run(encryptedRefresh, accountId);
        } else {
          db.prepare("INSERT INTO cloud_configs (account_id, provider, refresh_token) VALUES (?, 'Google Drive', ?)").run(accountId, encryptedRefresh);
        }

        // Create dedicated folder
        const client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          `${process.env.APP_URL}/auth/google/callback`
        );
        client.setCredentials(tokens);
        const drive = google.drive({ version: 'v3', auth: client });
        
        await drive.files.create({
          requestBody: {
            name: 'Adera_ERP_Backups',
            mimeType: 'application/vnd.google-apps.folder',
          }
        });
      }

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/cloud/e2ee", (req, res, next) => {
    try {
      const { accountId } = (req as any).user;
      const { enabled, key } = z.object({ enabled: z.boolean(), key: z.string().optional() }).parse(req.body);
      
      const existing = db.prepare("SELECT id FROM cloud_configs WHERE account_id = ?").get(accountId);
      if (existing) {
        db.prepare("UPDATE cloud_configs SET e2ee_enabled = ?, e2ee_key = ? WHERE account_id = ?").run(enabled ? 1 : 0, key || null, accountId);
      } else {
        db.prepare("INSERT INTO cloud_configs (account_id, e2ee_enabled, e2ee_key) VALUES (?, ?, ?)").run(accountId, enabled ? 1 : 0, key || null);
      }
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
      next(e);
    }
  });

  // Payment Webhook Endpoint
  app.post("/api/webhook/payment", (req, res, next) => {
    try {
      const webhookSchema = z.object({
        account_id: z.number(),
        plan: z.enum(['basic', 'pro']),
        status: z.enum(['active', 'past_due', 'cancelled']),
        secret: z.string()
      });

      const { account_id, plan, status, secret } = webhookSchema.parse(req.body);

      // Simple secret verification (In production, use a secure signature check)
      if (secret !== process.env.PAYMENT_WEBHOOK_SECRET && secret !== 'adera_secret_123') {
        return res.status(401).json({ error: "Invalid webhook secret" });
      }

      const updateTransaction = db.transaction(() => {
        // Update subscription
        db.prepare("UPDATE subscriptions SET plan = ?, status = ? WHERE account_id = ?").run(plan, status, account_id);
        
        // Update all users in that account to reflect the new plan
        db.prepare("UPDATE users SET plan = ?, subscription_status = ? WHERE account_id = ?").run(
          plan.charAt(0).toUpperCase() + plan.slice(1), 
          status.charAt(0).toUpperCase() + status.slice(1), 
          account_id
        );

        // Record payment
        db.prepare("INSERT INTO payments (account_id, amount, status) VALUES (?, ?, ?)").run(
          account_id, 
          plan === 'pro' ? 1000 : 500, 
          'completed'
        );
      });

      updateTransaction();
      res.json({ success: true });
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues });
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
