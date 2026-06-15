const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dbDir, 'hotspring.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      zone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      temperature REAL DEFAULT 40,
      capacity INTEGER DEFAULT 20,
      minerals TEXT,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pool_status_logs (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      status TEXT NOT NULL,
      temperature REAL,
      operator_id TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (pool_id) REFERENCES pools(id)
    );

    CREATE TABLE IF NOT EXISTS water_quality_records (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      temperature REAL NOT NULL,
      turbidity REAL NOT NULL,
      ph REAL,
      disinfection_type TEXT,
      disinfection_amount REAL,
      operator_id TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (pool_id) REFERENCES pools(id)
    );

    CREATE TABLE IF NOT EXISTS mineral_supplements (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      mineral_type TEXT NOT NULL,
      amount REAL NOT NULL,
      operator_id TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (pool_id) REFERENCES pools(id)
    );

    CREATE TABLE IF NOT EXISTS disinfection_records (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      disinfectant_type TEXT NOT NULL,
      amount REAL NOT NULL,
      operator_id TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (pool_id) REFERENCES pools(id)
    );

    CREATE TABLE IF NOT EXISTS drainage_records (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      water_volume REAL,
      operator_id TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (pool_id) REFERENCES pools(id)
    );

    CREATE TABLE IF NOT EXISTS maintenance_records (
      id TEXT PRIMARY KEY,
      pool_id TEXT,
      equipment_type TEXT NOT NULL,
      issue_description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT DEFAULT 'normal',
      assignee_id TEXT,
      assignee_name TEXT,
      operator_id TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      resolution TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (pool_id) REFERENCES pools(id)
    );

    CREATE TABLE IF NOT EXISTS pool_closures (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      closed_at TEXT NOT NULL,
      reopened_at TEXT,
      operator_id TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (pool_id) REFERENCES pools(id)
    );

    CREATE TABLE IF NOT EXISTS front_desk_records (
      id TEXT PRIMARY KEY,
      service_type TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      ticket_type TEXT,
      pool_id TEXT,
      from_pool_id TEXT,
      to_pool_id TEXT,
      start_time TEXT,
      end_time TEXT,
      people_count INTEGER DEFAULT 1,
      operator_id TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (pool_id) REFERENCES pools(id)
    );

    CREATE TABLE IF NOT EXISTS patrol_records (
      id TEXT PRIMARY KEY,
      pool_id TEXT,
      zone TEXT NOT NULL,
      visitor_density TEXT NOT NULL,
      reminders TEXT,
      issues_found TEXT,
      operator_id TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (pool_id) REFERENCES pools(id)
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      pool_id TEXT,
      zone TEXT,
      monitor_point TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      complaint_type TEXT NOT NULL,
      description TEXT NOT NULL,
      rescue_involved INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      handler_id TEXT,
      handler_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (pool_id) REFERENCES pools(id)
    );

    CREATE TABLE IF NOT EXISTS compensations (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      amount REAL NOT NULL,
      compensation_method TEXT NOT NULL,
      plan_description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      approver_id TEXT,
      approver_name TEXT,
      operator_id TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id)
    );
  `);

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, username, name, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    const users = [
      ['user-frontdesk', 'frontdesk', '张前厅', 'frontdesk'],
      ['user-pool', 'pool', '李池区', 'pool_attendant'],
      ['user-water', 'water', '王水质', 'water_quality'],
      ['user-engineering', 'engineering', '赵工程', 'engineering'],
      ['user-housekeeper', 'housekeeper', '刘管家', 'housekeeper'],
      ['user-cs', 'customerservice', '陈客服', 'customer_service'],
      ['user-admin', 'admin', '孙管理', 'admin']
    ];
    users.forEach(([id, username, name, role]) => {
      insertUser.run(id, username, name, role, now);
    });
  }

  const poolCount = db.prepare('SELECT COUNT(*) as count FROM pools').get().count;
  if (poolCount === 0) {
    const insertPool = db.prepare(`
      INSERT INTO pools (id, name, zone, status, temperature, capacity, minerals, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    const pools = [
      ['pool-001', '贵妃汤', 'A区-唐风区', 'open', 42, 15, '硫磺', '唐代风格贵妃专用汤池'],
      ['pool-002', '太子汤', 'A区-唐风区', 'open', 40, 20, '硫磺', '太子专用汤池'],
      ['pool-003', '星辰汤', 'A区-唐风区', 'open', 39, 25, '温泉矿物质', '仰望星空的大型汤池'],
      ['pool-004', '茉莉池', 'B区-花香区', 'open', 38, 18, '茉莉花', '茉莉花香汤池'],
      ['pool-005', '玫瑰池', 'B区-花香区', 'open', 40, 18, '玫瑰花', '玫瑰花香汤池'],
      ['pool-006', '薰衣草池', 'B区-花香区', 'maintenance', 0, 15, '薰衣草', '薰衣草香薰汤池-维护中'],
      ['pool-007', '牛奶池', 'C区-养生区', 'open', 41, 12, '牛奶蛋白', '美容养颜牛奶池'],
      ['pool-008', '药浴池', 'C区-养生区', 'open', 43, 10, '中草药', '中药养生药浴池'],
      ['pool-009', '儿童戏水池', 'D区-亲子区', 'open', 35, 30, '无', '专为儿童设计的温水池'],
      ['pool-010', '鱼疗池', 'D区-亲子区', 'open', 37, 20, '温泉鱼', '亲亲鱼疗池']
    ];
    pools.forEach(([id, name, zone, status, temperature, capacity, minerals, description]) => {
      insertPool.run(id, name, zone, status, temperature, capacity, minerals, description, now, now);
    });
  }
}

initDatabase();

module.exports = db;
