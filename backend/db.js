import Database from 'better-sqlite3';
export function createDb(path = process.env.DB_PATH || './dealership.db') {
 const db = new Database(path);
 db.pragma('journal_mode = WAL');
 db.pragma('foreign_keys = ON');
 db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')));
 CREATE TABLE IF NOT EXISTS vehicles(id INTEGER PRIMARY KEY AUTOINCREMENT,make TEXT NOT NULL,model TEXT NOT NULL,category TEXT NOT NULL,price REAL NOT NULL CHECK(price>=0),quantity INTEGER NOT NULL CHECK(quantity>=0),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS transactions(id INTEGER PRIMARY KEY AUTOINCREMENT,vehicle_id INTEGER NOT NULL,user_id INTEGER NOT NULL,type TEXT NOT NULL CHECK(type IN ('purchase','restock')),quantity INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(vehicle_id) REFERENCES vehicles(id),FOREIGN KEY(user_id) REFERENCES users(id));`);
 return db;
}
