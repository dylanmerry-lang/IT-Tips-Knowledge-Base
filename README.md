# Conquest Solutions Tips and Knowledge Base

A comprehensive web application for tracking common IT support issues and maintaining a knowledge base of frequently encountered problems and their resolutions. Features advanced file attachment support, hierarchical organization, and modern UI enhancements.

## Features

- 📋 **Tip Management**: Store and organize knowledge base tips with problem descriptions and solutions
- 🔐 **Authentication**: Cloudflare Zero Trust integration with automatic user identification
💬 **Comments & Feedback**: Threaded discussion system using authenticated user names
- 📎 **File Attachments**: Upload images, documents, and files with automatic thumbnail generation
- 🔍 **Advanced Search**: Find tips by title, problem, solution, location, or category
- 📂 **Hierarchical Categories**: Organized into FAQ, SOP, Troubleshooting Guide, Maps, and Network categories
- 📍 **Location Tracking**: Associate tips with specific locations for better organization
- 📊 **Audit Logging**: Complete change tracking with compliance reporting and event history
- ⚙️ **Settings Panel**: Administrative interface with audit logs, statistics, and system information
- 🧭 **Carousel Navigation**: Scrollable tip cards with arrow and wheel navigation
- ✏️ **Full CRUD Operations**: Create, read, update, and delete tips with confirmation dialogs
- 🎨 **Modern UI**: Clean, responsive design that works on all devices
- 💾 **SQLite Database**: Robust data persistence with proper relationships
- ⚡ **Fast & Lightweight**: Optimized performance with minimal dependencies

## Technology Stack

- **Backend**: Node.js + Express.js
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **UI Framework**: [Milligram](https://milligram.io/) - Minimalist CSS framework (2kb gzipped)
- **Database**: SQLite with prepared statements
- **Authentication**: Cloudflare Zero Trust integration
- **File Processing**: Multer (uploads) + Sharp (image thumbnails)
- **Audit Logging**: Comprehensive change tracking and compliance
- **Styling**: Clean, professional design with consistent typography and dark mode
- **Security**: Input validation, file type checking, secure file storage

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dylanmerry-lang/IT-Tips-Knowledge-Base.git
   cd IT-Tips-Knowledge-Base
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### Viewing Tips
- Browse all IT tips on the main page
- Click on any tip card to view full details
- Use the search bar to find specific tips
- Filter by category using the dropdown

### Adding New Tips
- Click "Add New Tip" button
- Fill in the form with:
  - **Title**: Brief description of the issue
  - **Category**: Knowledge base category (FAQ, SOP, Troubleshooting Guide, Maps, Network)
  - **Problem**: Detailed problem description
  - **Solution**: Step-by-step resolution guide
  - **Location** (optional): Where the issue occurs (e.g., "Office A", "Server Room")
  - **Additional Details** (optional): Extra context or notes
  - **Attachments** (optional): Upload images, documents, or files (max 5 files, 10MB each)

### Managing Tips
- All tips are stored in a SQLite database
- File attachments are stored securely on the server
- Data persists between server restarts
- Automatic thumbnail generation for image attachments
- Full backup and migration capabilities

### Comments & Collaboration
- **Threaded Discussions**: Reply to comments for detailed conversations
- **Authenticated Users**: Comments automatically use Cloudflare Zero Trust authenticated names
- **Real-time Updates**: Comments load dynamically when viewing tips
- **Moderation**: Users can only edit/delete their own comments
- **Feedback Loop**: Encourage knowledge sharing and improvement

### Audit Logging & Compliance
- **Complete Event Tracking**: All tip and attachment operations are logged
- **Change History**: View who made changes and when
- **Compliance Reporting**: Generate audit reports for regulatory requirements
- **Entity-Specific Logs**: Track changes to individual tips or attachments
- **Statistics Dashboard**: View system usage and activity metrics
- **Settings Panel**: Access audit logs through the ⚙️ settings button
- **Dark Mode**: Toggle in Settings → Settings tab

#### Editing Tips
- Hover over any tip card to reveal Edit and Delete buttons
- Click "Edit" to modify the tip's title, category, problem, or solution
- Click the tip card itself to view full details with edit options

#### Deleting Tips
- Click "Delete" button on tip cards or in the detail view
- Confirmation dialog prevents accidental deletions
- Deleted tips are permanently removed from the system

## Project Structure

```
IT-Tips-Knowledge-Base/
├── server/
│   ├── app.js                 # Express server and API routes
│   ├── database.js            # SQLite database setup and queries
│   ├── upload.js              # File upload configuration and processing
│   └── migrate.js             # Database migration utilities
├── public/
│   ├── index.html             # Main HTML page
│   ├── css/
│   │   └── styles.css         # Application styles
│   └── js/
│       ├── app.js             # Frontend JavaScript
│       └── carousel.js        # Carousel + swipe utilities
├── database/
│   └── knowledge_base.db      # SQLite database file
├── uploads/
│   ├── tips/                  # Uploaded files
│   └── thumbnails/            # Generated image thumbnails
├── data/
│   ├── tips.json              # Legacy data (migrated)
│   └── tips_backup.json       # Original data backup
├── package.json               # Dependencies and scripts
├── README.md                  # This file
├── test-upload.html           # File upload testing page
└── .gitignore                 # Git ignore rules
```

## API Endpoints

### Tips Management
- `GET /api/tips` - Retrieve all tips
- `GET /api/tips/:id` - Retrieve single tip
- `POST /api/tips` - Create new tip
- `PUT /api/tips/:id` - Update existing tip
- `DELETE /api/tips/:id` - Delete tip

### File Attachments
- `POST /api/tips/:id/attachments` - Upload files for a tip
- `GET /api/tips/:id/attachments` - Get attachments for a tip
- `DELETE /api/attachments/:id` - Delete an attachment

### Comments & Feedback
- `GET /api/tips/:id/comments` - Get all comments for a tip (threaded)
- `POST /api/tips/:id/comments` - Create a new comment or reply
- `PUT /api/comments/:id` - Update a comment (author only)
- `DELETE /api/comments/:id` - Delete a comment (author only)

### Audit Logging
- `GET /api/audit-logs` - Get audit logs with filtering
- `GET /api/audit-logs/stats` - Get audit statistics
- `GET /api/audit-logs/:entityType/:entityId` - Get logs for specific entity

### Testing
- `POST /api/test-upload` - Test file upload functionality

## Sample Data

The application comes with sample knowledge base entries including:
- Windows Update troubleshooting guides
- Printer connectivity solutions
- Email configuration procedures
- Network setup documentation

## Development

### Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server (same as start)

### Customization

- **Categories**: Edit the category options in `public/index.html` and `public/js/app.js`
- **Styling**: Modify `public/css/styles.css` for custom appearance
- **Database**: Modify `server/database.js` for database schema changes
- **File Upload**: Configure upload settings in `server/upload.js`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use for personal or commercial projects.

## Support

For questions or issues:
- Check the browser console for errors
- Verify Node.js and npm are properly installed
- Ensure port 3000 is not in use by other applications

## Future Enhancements

- [ ] Version control with rollback capabilities
- [ ] Tip voting and rating system
- [ ] Export functionality (PDF, CSV)
- [ ] Advanced analytics and reporting
- [ ] Bulk import/export operations
- [ ] API rate limiting and security enhancements