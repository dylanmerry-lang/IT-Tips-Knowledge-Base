const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, '../uploads');
const tipsDir = path.join(uploadsDir, 'tips');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

// Create directories if they don't exist
[uploadsDir, tipsDir, thumbnailsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File type validation
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.txt', '.doc', '.docx'];

const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error(`File extension ${ext} is not allowed`), false);
  }

  cb(null, true);
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('Storing file in directory:', tipsDir);
    cb(null, tipsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    console.log('Generated filename:', uniqueName, 'for original:', file.originalname);
    cb(null, uniqueName);
  }
});

// Upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per upload
  }
});

// Image processing and thumbnail generation
const generateThumbnail = async (inputPath, outputPath, options = {}) => {
  const { width = 200, height = 200, fit = 'cover' } = options;

  try {
    await sharp(inputPath)
      .resize(width, height, {
        fit: fit,
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    return true;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return false;
  }
};

// Process uploaded files
const processUploadedFiles = async (files) => {
  const processedFiles = [];

  for (const file of files) {
    const thumbnailFilename = `thumb_${file.filename}`;
    const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);

    // Generate thumbnail for images
    let thumbnailPathRelative = null;
    if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml') {
      try {
        const thumbnailGenerated = await generateThumbnail(file.path, thumbnailPath);
        if (thumbnailGenerated) {
          thumbnailPathRelative = `/uploads/thumbnails/${thumbnailFilename}`;
        }
      } catch (thumbnailError) {
        console.error('Thumbnail generation failed for', file.filename, ':', thumbnailError);
        // Continue without thumbnail
      }
    }

    processedFiles.push({
      originalName: file.originalname,
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      thumbnailPath: thumbnailPathRelative,
      uploadedAt: new Date().toISOString()
    });
  }

  return processedFiles;
};

// Cleanup function for orphaned files
const cleanupOrphanedFiles = async () => {
  try {
    const { getAllTips, getAttachmentsByTipId } = require('./database').statements;

    // Get all tips and their attachments
    const tips = getAllTips.all();
    const activeFiles = new Set();

    for (const tip of tips) {
      if (tip.id) {
        const attachments = getAttachmentsByTipId.all(tip.id);
        attachments.forEach(att => {
          activeFiles.add(att.filename);
          if (att.thumbnail_path) {
            const thumbFilename = path.basename(att.thumbnail_path);
            activeFiles.add(thumbFilename);
          }
        });
      }
    }

    // Check tips directory
    const tipFiles = fs.readdirSync(tipsDir);
    for (const file of tipFiles) {
      if (!activeFiles.has(file)) {
        try {
          fs.unlinkSync(path.join(tipsDir, file));
          console.log(`Cleaned up orphaned file: ${file}`);
        } catch (error) {
          console.error(`Error deleting orphaned file ${file}:`, error);
        }
      }
    }

    // Check thumbnails directory
    const thumbFiles = fs.readdirSync(thumbnailsDir);
    for (const file of thumbFiles) {
      if (!activeFiles.has(file)) {
        try {
          fs.unlinkSync(path.join(thumbnailsDir, file));
          console.log(`Cleaned up orphaned thumbnail: ${file}`);
        } catch (error) {
          console.error(`Error deleting orphaned thumbnail ${file}:`, error);
        }
      }
    }

  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

module.exports = {
  upload,
  processUploadedFiles,
  cleanupOrphanedFiles,
  allowedMimeTypes,
  allowedExtensions
};