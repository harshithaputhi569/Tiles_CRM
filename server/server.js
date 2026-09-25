require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes      = require('./routes/authRoutes');
const staffRoutes     = require('./routes/staffRoutes');
const customerRoutes  = require('./routes/customerRoutes');
const feedbackRoutes  = require('./routes/feedbackRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const reportRoutes    = require('./routes/reportRoutes');

connectDB();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL, // Set this on Render to your Vercel URL
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Health check (must be BEFORE other /api routes to avoid middleware interception)
app.get('/api/health', (req, res) => res.json({ status: 'TileShow CRM API running ✅' }));

// Routes
app.use('/api/auth',      authRoutes);
app.use('/api/staff',     staffRoutes);
app.use('/api',           customerRoutes);
app.use('/api/feedback',  feedbackRoutes);
app.use('/api/complaints',complaintRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports',   reportRoutes);



// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 TileShow CRM Server running on port ${PORT}`));
