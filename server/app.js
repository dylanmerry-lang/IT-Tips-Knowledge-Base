const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Initialize database connection
const { db } = require('./database');

// Initialize upload system
const { upload, processUploadedFiles, cleanupOrphanedFiles } = require('./upload');

// Initialize audit logging
const auditLogger = require('./audit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to extract user info from Cloudflare Zero Trust headers
app.use((req, res, next) => {
  // Extract user information from Cloudflare Zero Trust headers
  const userEmail = req.get('CF-Access-Authenticated-User-Email') ||
                   req.get('Cf-Access-Authenticated-User-Email') ||
                   req.get('cf-access-authenticated-user-email');

  if (userEmail) {
    // Extract name from email (part before @)
    const nameFromEmail = userEmail.split('@')[0];
    // Convert to display name (capitalize first letter, replace dots/underscores with spaces)
    const displayName = nameFromEmail
      .replace(/[._-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    req.user = {
      email: userEmail,
      name: displayName,
      authenticated: true
    };

    console.log(`Authenticated user: ${displayName} (${userEmail})`);
  } else {
    req.user = {
      authenticated: false,
      name: 'Anonymous'
    };
  }

  next();
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes

// GET /api/tips - Get all tips
app.get('/api/tips', (req, res) => {
  try {
    const { getAllTips } = require('./database').statements;
    const tips = getAllTips.all();
    res.json(tips);
  } catch (error) {
    console.error('Error fetching tips:', error);
    res.status(500).json({ error: 'Failed to fetch tips' });
  }
});

// GET /api/tips/:id - Get single tip
app.get('/api/tips/:id', (req, res) => {
  try {
    const { getTipById } = require('./database').statements;
    const tip = getTipById.get(parseInt(req.params.id));

    if (!tip) {
      return res.status(404).json({ error: 'Tip not found' });
    }

    res.json(tip);
  } catch (error) {
    console.error('Error fetching tip:', error);
    res.status(500).json({ error: 'Failed to fetch tip' });
  }
});

// POST /api/tips - Create new tip
app.post('/api/tips', auditLogger.auditTipsMiddleware(), (req, res) => {
  try {
    const { createTip } = require('./database').statements;

    // Use authenticated user's name if available, otherwise allow manual input
    const authorName = req.user.authenticated ? req.user.name : (req.body.author_name || 'Anonymous');

    const result = createTip.run(
      req.body.title,
      req.body.category,
      req.body.problem,
      req.body.solution || req.body.chatgpt_answer,
      req.body.location || null,
      req.body.additional_details || null,
      authorName
    );

    const newTip = {
      id: result.lastInsertRowid,
      title: req.body.title,
      category: req.body.category,
      problem: req.body.problem,
      solution: req.body.solution || req.body.chatgpt_answer,
      location: req.body.location || null,
      additional_details: req.body.additional_details || null,
      author_name: authorName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.status(201).json(newTip);
  } catch (error) {
    console.error('Error creating tip:', error);
    res.status(500).json({ error: 'Failed to create tip' });
  }
});

// PUT /api/tips/:id - Update tip
app.put('/api/tips/:id', auditLogger.auditTipsMiddleware(), (req, res) => {
  try {
    const { updateTip, getTipById } = require('./database').statements;
    const tipId = parseInt(req.params.id);

    // Check if tip exists
    const existingTip = getTipById.get(tipId);
    if (!existingTip) {
      return res.status(404).json({ error: 'Tip not found' });
    }

    // Update tip
    updateTip.run(
      req.body.title,
      req.body.category,
      req.body.problem,
      req.body.solution || req.body.chatgpt_answer,
      req.body.location || null,
      req.body.additional_details || null,
      req.body.author_name || existingTip.author_name,
      tipId
    );

    // Get updated tip
    const updatedTip = getTipById.get(tipId);
    res.json(updatedTip);
  } catch (error) {
    console.error('Error updating tip:', error);
    res.status(500).json({ error: 'Failed to update tip' });
  }
});

// DELETE /api/tips/:id - Delete tip
app.delete('/api/tips/:id', auditLogger.auditTipsMiddleware(), (req, res) => {
  try {
    const { deleteTip, getTipById } = require('./database').statements;
    const tipId = parseInt(req.params.id);

    // Check if tip exists
    const existingTip = getTipById.get(tipId);
    if (!existingTip) {
      return res.status(404).json({ error: 'Tip not found' });
    }

    // Soft delete tip
    deleteTip.run(tipId);
    res.json(existingTip);
  } catch (error) {
    console.error('Error deleting tip:', error);
    res.status(500).json({ error: 'Failed to delete tip' });
  }
});

// File Upload Routes

// POST /api/tips/:id/attachments - Upload attachments for a tip
app.post('/api/tips/:id/attachments', auditLogger.auditTipsMiddleware(), (req, res, next) => {
  console.log('=== ATTACHMENT UPLOAD MIDDLEWARE HIT ===');
  console.log('Route params:', req.params);
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers['content-type']);
  next();
}, upload.array('attachments', 5), async (req, res) => {
  console.log('=== ATTACHMENT UPLOAD ROUTE HANDLER HIT ===');
  try {
    const tipId = parseInt(req.params.id);
    console.log('Attachment upload request for tip ID:', tipId);
    console.log('Files received:', req.files ? req.files.length : 0);
    console.log('Body:', req.body);

    const { getTipById, createAttachment } = require('./database').statements;

    // Check if tip exists
    const tip = getTipById.get(tipId);
    if (!tip) {
      console.log('Tip not found:', tipId);
      return res.status(404).json({ error: 'Tip not found' });
    }

    if (!req.files || req.files.length === 0) {
      console.log('No files in request');
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Process uploaded files
    console.log('Processing uploaded files...');
    const processedFiles = await processUploadedFiles(req.files);
    console.log('Processed files:', processedFiles.length);

    // Save attachment records to database
    const savedAttachments = [];
    for (const file of processedFiles) {
      console.log('Saving attachment to database:', file.filename);
      try {
        const result = createAttachment.run(
          tipId,
          file.filename,
          file.originalName,
          file.mimeType,
          file.size,
          file.thumbnailPath,
          req.body.author_name || 'Anonymous'
        );

        console.log('Attachment saved with ID:', result.lastInsertRowid);
        savedAttachments.push({
          id: result.lastInsertRowid,
          tip_id: tipId,
          filename: file.filename,
          original_name: file.originalName,
          mime_type: file.mimeType,
          size: file.size,
          thumbnail_path: file.thumbnailPath,
          uploaded_by: req.body.author_name || 'Anonymous',
          created_at: file.uploadedAt
        });
      } catch (dbError) {
        console.error('Database error saving attachment:', dbError);
        throw dbError;
      }
    }

    res.status(201).json({
      message: `Successfully uploaded ${savedAttachments.length} file(s)`,
      attachments: savedAttachments
    });

  } catch (error) {
    console.error('Error uploading attachments:', error);
    res.status(500).json({ error: error.message || 'Failed to upload attachments' });
  }
});

// Test endpoint for debugging file uploads
app.post('/api/test-upload', upload.array('attachments', 5), (req, res) => {
  console.log('Test upload endpoint called');
  console.log('Files:', req.files ? req.files.length : 0);
  console.log('Body:', req.body);

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  res.json({
    message: 'Test upload successful',
    files: req.files.map(f => ({
      originalname: f.originalname,
      filename: f.filename,
      size: f.size,
      mimetype: f.mimetype
    }))
  });
});

// GET /api/tips/:id/attachments - Get attachments for a tip
app.get('/api/tips/:id/attachments', (req, res) => {
  try {
    const tipId = parseInt(req.params.id);
    console.log('Fetching attachments for tip ID:', tipId);

    const { getAttachmentsByTipId } = require('./database').statements;
    const attachments = getAttachmentsByTipId.all(tipId);
    console.log('Found attachments:', attachments.length, attachments);

    res.json(attachments);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
});

// DELETE /api/attachments/:id - Delete an attachment
app.delete('/api/attachments/:id', auditLogger.auditTipsMiddleware(), (req, res) => {
  try {
    const { deleteAttachment, getAttachmentsByTipId } = require('./database').statements;
    const attachmentId = parseInt(req.params.id);

    // Get attachment info before deletion for cleanup
    const attachments = getAttachmentsByTipId.all(); // This needs to be improved for specific attachment
    // For now, we'll just delete from database - file cleanup can be done separately

    deleteAttachment.run(attachmentId);
    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

// Audit Log API Endpoints

// GET /api/audit-logs - Get audit logs with optional filtering
app.get('/api/audit-logs', (req, res) => {
  try {
    const {
      limit = 50,
      offset = 0,
      action,
      entityType,
      entityId,
      authorName
    } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      action,
      entityType,
      entityId: entityId ? parseInt(entityId) : undefined,
      authorName
    };

    const logs = auditLogger.getAuditLogs(options);
    res.json({
      logs,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: logs.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error retrieving audit logs:', error);
    res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
});

// GET /api/audit-logs/stats - Get audit statistics
app.get('/api/audit-logs/stats', (req, res) => {
  try {
    const stats = auditLogger.getAuditStats();
    if (stats) {
      res.json(stats);
    } else {
      res.status(500).json({ error: 'Failed to retrieve audit statistics' });
    }
  } catch (error) {
    console.error('Error retrieving audit stats:', error);
    res.status(500).json({ error: 'Failed to retrieve audit statistics' });
  }
});

// GET /api/audit-logs/:entityType/:entityId - Get audit logs for specific entity
app.get('/api/audit-logs/:entityType/:entityId', (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const logs = auditLogger.getAuditLogs({
      entityType,
      entityId: parseInt(entityId)
    });
    res.json({ logs });
  } catch (error) {
    console.error('Error retrieving entity audit logs:', error);
    res.status(500).json({ error: 'Failed to retrieve entity audit logs' });
  }
});

// Comment API Endpoints

// GET /api/tips/:id/comments - Get all comments for a tip
app.get('/api/tips/:id/comments', (req, res) => {
  try {
    const tipId = parseInt(req.params.id);
    const { getCommentsByTipId } = require('./database').statements;

    const comments = getCommentsByTipId.all(tipId);

    // Build threaded structure
    const threadedComments = buildThreadedComments(comments);

    res.json(threadedComments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/tips/:id/comments - Create a new comment
app.post('/api/tips/:id/comments', (req, res) => {
  try {
    const tipId = parseInt(req.params.id);
    const { content, parent_id } = req.body;
    const { getTipById, createComment } = require('./database').statements;

    // Check if user is authenticated
    if (!req.user.authenticated) {
      return res.status(401).json({ error: 'Authentication required to comment' });
    }

    // Verify tip exists
    const tip = getTipById.get(tipId);
    if (!tip) {
      return res.status(404).json({ error: 'Tip not found' });
    }

    // Validate input
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Create comment using authenticated user's name
    const result = createComment.run(
      tipId,
      req.user.name,
      content.trim(),
      parent_id ? parseInt(parent_id) : null
    );

    const newComment = {
      id: result.lastInsertRowid,
      tip_id: tipId,
      author_name: req.user.name,
      content: content.trim(),
      parent_id: parent_id ? parseInt(parent_id) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: 1,
      replies: []
    };

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// PUT /api/comments/:id - Update a comment
app.put('/api/comments/:id', (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const { content } = req.body;
    const { getCommentById, updateComment } = require('./database').statements;

    // Check if user is authenticated
    if (!req.user.authenticated) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify comment exists and belongs to authenticated user
    const comment = getCommentById.get(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.author_name !== req.user.name) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    // Update comment
    const result = updateComment.run(content.trim(), commentId, req.user.name);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Comment not found or already updated' });
    }

    // Return updated comment
    const updatedComment = getCommentById.get(commentId);
    res.json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// DELETE /api/comments/:id - Delete a comment
app.delete('/api/comments/:id', (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const { getCommentById, deleteComment, getCommentReplies } = require('./database').statements;

    // Check if user is authenticated
    if (!req.user.authenticated) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify comment exists and belongs to authenticated user
    const comment = getCommentById.get(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.author_name !== req.user.name) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    // Check if comment has replies
    const replies = getCommentReplies.all(commentId);
    if (replies.length > 0) {
      return res.status(400).json({ error: 'Cannot delete a comment that has replies' });
    }

    // Soft delete comment
    const result = deleteComment.run(commentId, req.user.name);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Helper function to build threaded comment structure
function buildThreadedComments(comments) {
  const commentMap = new Map();
  const rootComments = [];

  // First pass: create comment objects
  comments.forEach(comment => {
    comment.replies = [];
    commentMap.set(comment.id, comment);
  });

  // Second pass: build the tree
  comments.forEach(comment => {
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies.push(comment);
      }
    } else {
      rootComments.push(comment);
    }
  });

  return rootComments;
}

// Debug endpoint to check raw audit logs
app.get('/api/debug/audit-logs', (req, res) => {
  try {
    const { db } = require('./database');
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10').all();
    res.json({
      count: logs.length,
      logs: logs
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  db.close();
  process.exit(0);
});

// List all routes for debugging
console.log('Registered routes:');
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Conquest Solutions Knowledge Base server running on http://localhost:${PORT}`);
});