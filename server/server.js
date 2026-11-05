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
const notificationRoutes = require('./routes/notificationRoutes');

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
app.use('/api/auth',          authRoutes);
app.use('/api/staff',         staffRoutes);
app.use('/api/feedback',      feedbackRoutes);
app.use('/api/complaints',    complaintRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api',               customerRoutes);



// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 TileShow CRM Server running on port ${PORT}`);
  // Start the Special Day daily cron after DB is connected
  startSpecialDayCron();
});

// ─── Special Day Daily Cron ───────────────────────────────────────────────────
// Fires once immediately on startup (to catch missed days) and then every 24 hours.
// For each visit whose specialDayDate matches TODAY, it sends popup notifications
// to both the registering staff member and all admin users.
async function startSpecialDayCron() {
  const runSpecialDayCheck = async () => {
    try {
      const Visit        = require('./models/Visit');
      const Notification = require('./models/Notification');
      const User         = require('./models/User');

      const now   = new Date();
      // Build a date range for "today" in UTC (covers the whole day regardless of TZ)
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const visits = await Visit.find({
        specialDayDate: { $gte: start, $lte: end },
        specialDayReason: { $ne: '' },
      })
        .populate('customer', 'name mobile')
        .populate('staff', 'name designation');

      if (!visits.length) return;

      for (const visit of visits) {
        const custName   = visit.customer?.name   || 'Customer';
        const custMobile = visit.customer?.mobile || '';
        const staffName  = visit.staff?.name      || 'Staff';
        const reason     = visit.specialDayReason;
        const dateStr    = new Date(visit.specialDayDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        const title   = `🎉 Today is a Special Day! – ${custName}`;
        const message = `${custName} (${custMobile}) has a special occasion today: "${reason}" (Registered by ${staffName})`;

        const sharedMeta = {
          customerName  : custName,
          customerMobile: custMobile,
          staffName,
          staffId       : visit.staff?._id || null,
          visitId       : visit._id,
          specialDayDate: visit.specialDayDate,
          specialDayReason: reason,
        };

        // Check if already notified today for this special day
        const alreadySent = await Notification.findOne({
          referenceId: visit._id,
          title,
          createdAt: { $gte: start, $lte: end },
        });
        if (alreadySent) continue;

        // Notify admin (broadcast — no specific recipient)
        await Notification.createIfNotExists({
          recipient  : null,
          role       : 'admin',
          title,
          message,
          type       : 'general',
          referenceId: visit._id,
          metadata   : sharedMeta,
          link       : '/admin/visits',
        });

        // Notify the attending staff member specifically
        if (visit.staff?._id) {
          await Notification.createIfNotExists({
            recipient  : visit.staff._id,
            role       : 'staff',
            title,
            message,
            type       : 'general',
            referenceId: visit._id,
            metadata   : sharedMeta,
            link       : '/staff/my-visits',
          });
        }

        console.log(`🎉 Special Day notification sent for customer: ${custName} (${dateStr})`);
      }
    } catch (err) {
      console.error('Special Day cron error (non-fatal):', err.message);
    }
  };

  // Run once on startup, then every 24 hours
  await runSpecialDayCheck();
  setInterval(runSpecialDayCheck, 24 * 60 * 60 * 1000);
}
// ─────────────────────────────────────────────────────────────────────────────
