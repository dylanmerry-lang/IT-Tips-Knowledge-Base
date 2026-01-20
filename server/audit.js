const { statements, db } = require('./database');

// Audit logging middleware and utilities
class AuditLogger {
  constructor() {
    this.enabled = true;
  }

  // Generate human-readable description of changes
  generateChangeDescription(oldData, newData) {
    if (!oldData || !newData) return '';

    const changes = [];
    const fieldsToCheck = ['title', 'category', 'problem', 'solution', 'location', 'additional_details'];

    for (const field of fieldsToCheck) {
      const oldValue = oldData[field];
      const newValue = newData[field];

      // Handle null/undefined values
      const oldVal = oldValue || '';
      const newVal = newValue || '';

      if (oldVal !== newVal) {
        let fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        // Truncate long values for readability
        const truncate = (str, maxLen = 50) => str.length > maxLen ? str.substring(0, maxLen) + '...' : str;

        changes.push(`${fieldName}: "${truncate(oldVal)}" → "${truncate(newVal)}"`);
      }
    }

    return changes.length > 0 ? changes.join('; ') : 'No field changes detected';
  }

  // Log an audit event
  log(action, entityType, entityId, authorName, oldData = null, newData = null, req = null) {
    if (!this.enabled) return;

    console.log(`AUDIT LOG: Attempting to log ${action} on ${entityType} ${entityId} by ${authorName}`);

    try {
      const ipAddress = req ? this.getClientIP(req) : null;
      const userAgent = req ? req.get('User-Agent') : null;

      // Convert data to JSON strings if they're objects
      const oldDataStr = oldData ? JSON.stringify(oldData) : null;
      const newDataStr = newData ? JSON.stringify(newData) : null;

      console.log(`AUDIT LOG: Data - old: ${oldDataStr ? 'present' : 'null'}, new: ${newDataStr ? 'present' : 'null'}`);

      const result = statements.createAuditLog.run(
        action,
        entityType,
        entityId,
        authorName || 'Anonymous',
        oldDataStr,
        newDataStr,
        ipAddress,
        userAgent
      );

      console.log(`AUDIT LOG: Successfully created audit log with ID: ${result.lastInsertRowid}`);
    } catch (error) {
      console.error('Audit logging error:', error);
      console.error('Error details:', error.stack);
    }
  }

  // Get client IP address
  getClientIP(req) {
    // Check for forwarded IP headers (useful behind proxies/load balancers)
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIP = req.get('X-Real-IP');
    if (realIP) {
      return realIP;
    }

    // Fallback to connection remote address
    return req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           req.connection.socket?.remoteAddress ||
           'unknown';
  }

  // Middleware to audit tip operations
  auditTipsMiddleware() {
    return (req, res, next) => {
      // Store original data for comparison
      let originalData = null;

      // For updates and deletes, fetch original data
      if ((req.method === 'PUT' || req.method === 'DELETE') && req.params.id) {
        try {
          const tip = statements.getTipById.get(parseInt(req.params.id));
          if (tip) {
            originalData = { ...tip };
          }
        } catch (error) {
          console.error('Error fetching original tip data for audit:', error);
        }
      }

      // Store the original response.json method
      const originalJson = res.json;

      // Override res.json to log after successful operations
      res.json = (data) => {
        try {
          const authorName = req.body?.author_name ||
                           req.query?.author ||
                           req.get('X-Author-Name') ||
                           'Anonymous';

          if (req.method === 'POST' && req.path.startsWith('/api/tips') && !req.path.includes('/attachments')) {
            // Tip creation
            const title = data.title || 'Untitled Tip';
            this.log('CREATE', 'tip', data.id, authorName, null, { ...data, _displayTitle: title }, req);
          } else if (req.method === 'PUT' && req.path.match(/^\/api\/tips\/\d+$/)) {
            // Tip update - include change details
            const title = data.title || originalData?.title || 'Untitled Tip';
            const changeDescription = this.generateChangeDescription(originalData, data);
            this.log('UPDATE', 'tip', parseInt(req.params.id), authorName, originalData, { ...data, _displayTitle: title, _changes: changeDescription }, req);
          } else if (req.method === 'DELETE' && req.path.match(/^\/api\/tips\/\d+$/)) {
            // Tip deletion
            const title = originalData?.title || 'Untitled Tip';
            this.log('DELETE', 'tip', parseInt(req.params.id), authorName, { ...originalData, _displayTitle: title }, null, req);
          } else if (req.method === 'POST' && req.path.includes('/attachments')) {
            // Attachment upload
            if (data.attachments && data.attachments.length > 0) {
              data.attachments.forEach(attachment => {
                const displayTitle = attachment.original_name || `Attachment ${attachment.id}`;
                this.log('CREATE', 'attachment', attachment.id, authorName, null, { ...attachment, _displayTitle: displayTitle }, req);
              });
            }
          } else if (req.method === 'DELETE' && req.path.match(/^\/api\/attachments\/\d+$/)) {
            // Attachment deletion - we need to get attachment info before deletion
            // For now, just log with basic info
            this.log('DELETE', 'attachment', parseInt(req.params.id), authorName, { _displayTitle: `Attachment #${req.params.id}` }, null, req);
          } else if (req.method === 'POST' && req.path.match(/^\/api\/tips\/\d+\/comments$/)) {
            // Comment creation
            const displayTitle = `Comment by ${req.body.author_name || 'Anonymous'}`;
            this.log('CREATE', 'comment', data.id, authorName, null, { ...data, _displayTitle: displayTitle }, req);
          } else if (req.method === 'PUT' && req.path.match(/^\/api\/comments\/\d+$/)) {
            // Comment update
            const displayTitle = `Comment by ${req.body.author_name || 'Anonymous'}`;
            this.log('UPDATE', 'comment', parseInt(req.params.id), authorName, originalData, { ...data, _displayTitle: displayTitle }, req);
          } else if (req.method === 'DELETE' && req.path.match(/^\/api\/comments\/\d+$/)) {
            // Comment deletion
            const displayTitle = `Comment by ${req.body.author_name || 'Anonymous'}`;
            this.log('DELETE', 'comment', parseInt(req.params.id), authorName, { _displayTitle: displayTitle }, null, req);
          }
        } catch (auditError) {
          console.error('Error in audit logging:', auditError);
        }

        // Call the original response.json method
        return originalJson.call(res, data);
      };

      next();
    };
  }

  // Get audit logs with filtering options
  getAuditLogs(options = {}) {
    const {
      limit = 50,
      offset = 0,
      action,
      entityType,
      entityId,
      authorName
    } = options;

    console.log('AUDIT RETRIEVE: Getting audit logs with options:', options);

    try {
      let statement;
      let params;

      if (entityType && entityId) {
        // Get logs for specific entity
        statement = statements.getAuditLogsByEntity;
        params = [entityType, entityId];
        console.log('AUDIT RETRIEVE: Using entity-specific query');
      } else if (action) {
        // Get logs by action type
        statement = statements.getAuditLogsByAction;
        params = [action, limit, offset];
        console.log('AUDIT RETRIEVE: Using action-specific query');
      } else if (authorName) {
        // Get logs by author
        statement = statements.getAuditLogsByAuthor;
        params = [`%${authorName}%`, limit, offset];
        console.log('AUDIT RETRIEVE: Using author-specific query');
      } else {
        // Get all logs
        statement = statements.getAuditLogs;
        params = [limit, offset];
        console.log('AUDIT RETRIEVE: Using general query');
      }

      console.log('AUDIT RETRIEVE: Executing query with params:', params);
      const logs = statement.all(...params);
      console.log('AUDIT RETRIEVE: Found', logs.length, 'audit log records');

      // Parse JSON data back to objects
      const parsedLogs = logs.map(log => {
        try {
          return {
            ...log,
            old_data: log.old_data ? JSON.parse(log.old_data) : null,
            new_data: log.new_data ? JSON.parse(log.new_data) : null
          };
        } catch (parseError) {
          console.error('AUDIT RETRIEVE: Error parsing JSON data for log', log.id, parseError);
          return {
            ...log,
            old_data: null,
            new_data: null
          };
        }
      });

      console.log('AUDIT RETRIEVE: Successfully parsed', parsedLogs.length, 'audit logs');
      return parsedLogs;
    } catch (error) {
      console.error('Error retrieving audit logs:', error);
      console.error('Error stack:', error.stack);
      return [];
    }
  }

  // Get audit statistics
  getAuditStats() {
    try {
      const stats = {
        totalLogs: db.prepare('SELECT COUNT(*) as count FROM audit_logs').get().count,
        logsByAction: db.prepare(`
          SELECT action, COUNT(*) as count
          FROM audit_logs
          GROUP BY action
          ORDER BY count DESC
        `).all(),
        logsByEntityType: db.prepare(`
          SELECT entity_type, COUNT(*) as count
          FROM audit_logs
          GROUP BY entity_type
          ORDER BY count DESC
        `).all(),
        recentActivity: db.prepare(`
          SELECT action, entity_type, author_name, timestamp
          FROM audit_logs
          ORDER BY timestamp DESC
          LIMIT 10
        `).all()
      };

      return stats;
    } catch (error) {
      console.error('Error getting audit stats:', error);
      return null;
    }
  }
}

// Export singleton instance
const auditLogger = new AuditLogger();

module.exports = auditLogger;