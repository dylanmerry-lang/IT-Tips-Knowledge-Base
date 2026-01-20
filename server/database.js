const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database file path
const DB_PATH = path.join(__dirname, '../database/knowledge_base.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
const createTables = () => {
  // Tips table (enhanced with new fields, simplified without user auth)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      problem TEXT NOT NULL,
      solution TEXT NOT NULL,
      location TEXT,
      additional_details TEXT,
      author_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1
    )
  `);

  // Attachments table (simplified)
  db.exec(`
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tip_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      thumbnail_path TEXT,
      uploaded_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tip_id) REFERENCES tips(id) ON DELETE CASCADE
    )
  `);

  // Comments table (name-based, no user accounts)
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tip_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      parent_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (tip_id) REFERENCES tips(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    )
  `);

  // Audit logs table (comprehensive change tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      author_name TEXT,
      old_data TEXT,
      new_data TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Audit logs table (IP-based tracking, name-based)
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      author_name TEXT,
      old_data TEXT,
      new_data TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Initialize database
createTables();

// Prepared statements for better performance
const statements = {
  // Tip operations (simplified)
  createTip: db.prepare(`
    INSERT INTO tips (title, category, problem, solution, location, additional_details, author_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),

  updateTip: db.prepare(`
    UPDATE tips SET
      title = ?, category = ?, problem = ?, solution = ?, location = ?, additional_details = ?, author_name = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  getTipById: db.prepare('SELECT * FROM tips WHERE id = ? AND is_active = 1'),
  getAllTips: db.prepare('SELECT * FROM tips WHERE is_active = 1 ORDER BY updated_at DESC'),
  deleteTip: db.prepare('UPDATE tips SET is_active = 0 WHERE id = ?'),

  // Search tips with location
  searchTips: db.prepare(`
    SELECT * FROM tips
    WHERE is_active = 1 AND (
      title LIKE ? OR
      problem LIKE ? OR
      solution LIKE ? OR
      location LIKE ? OR
      author_name LIKE ?
    )
    ORDER BY updated_at DESC
  `),

  // Attachment operations (simplified)
  createAttachment: db.prepare(`
    INSERT INTO attachments (tip_id, filename, original_name, mime_type, size, thumbnail_path, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),

  getAttachmentsByTipId: db.prepare('SELECT * FROM attachments WHERE tip_id = ? ORDER BY created_at DESC'),
  deleteAttachment: db.prepare('DELETE FROM attachments WHERE id = ?'),

  // Comment operations (name-based)
  createComment: db.prepare(`
    INSERT INTO comments (tip_id, author_name, content, parent_id)
    VALUES (?, ?, ?, ?)
  `),

  getCommentsByTipId: db.prepare(`
    SELECT * FROM comments
    WHERE tip_id = ? AND is_active = 1
    ORDER BY created_at ASC
  `),

  updateComment: db.prepare('UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND author_name = ?'),
  deleteComment: db.prepare('UPDATE comments SET is_active = 0 WHERE id = ? AND author_name = ?'),

  // Comments CRUD operations
  createComment: db.prepare(`
    INSERT INTO comments (tip_id, author_name, content, parent_id)
    VALUES (?, ?, ?, ?)
  `),

  getCommentsByTipId: db.prepare(`
    SELECT * FROM comments
    WHERE tip_id = ? AND is_active = 1
    ORDER BY created_at ASC
  `),

  getCommentById: db.prepare(`
    SELECT * FROM comments
    WHERE id = ? AND is_active = 1
  `),

  updateComment: db.prepare(`
    UPDATE comments
    SET content = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND author_name = ? AND is_active = 1
  `),

  deleteComment: db.prepare(`
    UPDATE comments
    SET is_active = 0
    WHERE id = ? AND author_name = ?
  `),

  getCommentReplies: db.prepare(`
    SELECT * FROM comments
    WHERE parent_id = ? AND is_active = 1
    ORDER BY created_at ASC
  `),

  // Audit logging (comprehensive change tracking)
  createAuditLog: db.prepare(`
    INSERT INTO audit_logs (action, entity_type, entity_id, author_name, old_data, new_data, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getAuditLogs: db.prepare(`
    SELECT * FROM audit_logs
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `),

  getAuditLogsByEntity: db.prepare(`
    SELECT * FROM audit_logs
    WHERE entity_type = ? AND entity_id = ?
    ORDER BY timestamp DESC
  `),

  getAuditLogsByAction: db.prepare(`
    SELECT * FROM audit_logs
    WHERE action = ?
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `),

  getAuditLogsByAuthor: db.prepare(`
    SELECT * FROM audit_logs
    WHERE author_name LIKE ?
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `),
};

// Export database and prepared statements
module.exports = {
  db,
  statements,

  // Utility functions
  close: () => db.close(),

  // Migration helper
  migrateFromJSON: (jsonData) => {
    const transaction = db.transaction((tips) => {
      for (const tip of tips) {
        statements.createTip.run(
          tip.title,
          tip.category || 'FAQ', // Default category
          tip.problem,
          tip.chatgpt_answer || tip.solution || '',
          tip.location || null,
          tip.additional_details || null,
          'System Migration' // author_name for migrated data
        );
      }
    });

    transaction(jsonData.tips || []);
    console.log(`Migrated ${jsonData.tips?.length || 0} tips from JSON`);
  }
};