const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Data file path
const DATA_FILE = path.join(__dirname, '../data/tips.json');

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ tips: [] }, null, 2));
}

// Helper function to read tips data
function readTipsData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading tips data:', error);
    return { tips: [] };
  }
}

// Helper function to write tips data
function writeTipsData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing tips data:', error);
  }
}

// API Routes

// GET /api/tips - Get all tips
app.get('/api/tips', (req, res) => {
  const data = readTipsData();
  res.json(data.tips);
});

// GET /api/tips/:id - Get single tip
app.get('/api/tips/:id', (req, res) => {
  const data = readTipsData();
  const tip = data.tips.find(t => t.id === parseInt(req.params.id));

  if (!tip) {
    return res.status(404).json({ error: 'Tip not found' });
  }

  res.json(tip);
});

// POST /api/tips - Create new tip
app.post('/api/tips', (req, res) => {
  const data = readTipsData();
  const newTip = {
    id: Date.now(), // Simple ID generation
    title: req.body.title,
    category: req.body.category,
    problem: req.body.problem,
    chatgpt_answer: req.body.chatgpt_answer,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  data.tips.push(newTip);
  writeTipsData(data);

  res.status(201).json(newTip);
});

// PUT /api/tips/:id - Update tip
app.put('/api/tips/:id', (req, res) => {
  const data = readTipsData();
  const tipIndex = data.tips.findIndex(t => t.id === parseInt(req.params.id));

  if (tipIndex === -1) {
    return res.status(404).json({ error: 'Tip not found' });
  }

  data.tips[tipIndex] = {
    ...data.tips[tipIndex],
    ...req.body,
    updated_at: new Date().toISOString()
  };

  writeTipsData(data);
  res.json(data.tips[tipIndex]);
});

// DELETE /api/tips/:id - Delete tip
app.delete('/api/tips/:id', (req, res) => {
  const data = readTipsData();
  const tipIndex = data.tips.findIndex(t => t.id === parseInt(req.params.id));

  if (tipIndex === -1) {
    return res.status(404).json({ error: 'Tip not found' });
  }

  const deletedTip = data.tips.splice(tipIndex, 1)[0];
  writeTipsData(data);

  res.json(deletedTip);
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

// Start server
app.listen(PORT, () => {
  console.log(`IT Tips Tracker server running on http://localhost:${PORT}`);
});