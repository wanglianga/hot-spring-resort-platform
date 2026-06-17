const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/pools', require('./routes/pools'));
app.use('/api/users', require('./routes/users'));
app.use('/api/water-quality', require('./routes/waterQuality'));
app.use('/api/minerals', require('./routes/minerals'));
app.use('/api/disinfection', require('./routes/disinfection'));
app.use('/api/drainage', require('./routes/drainage'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/closures', require('./routes/closures'));
app.use('/api/frontdesk', require('./routes/frontdesk'));
app.use('/api/patrols', require('./routes/patrols'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/compensations', require('./routes/compensations'));
app.use('/api/pool-abnormal-reports', require('./routes/poolAbnormalReports'));
app.use('/api/pool-abnormal-decisions', require('./routes/poolAbnormalDecisions'));
app.use('/api/guest-notifications', require('./routes/guestNotifications'));
app.use('/api/retest-records', require('./routes/retestRecords'));
app.use('/api/group-conflicts', require('./routes/groupConflicts'));
app.use('/api/conflict-adjustments', require('./routes/conflictAdjustments'));
app.use('/api/stats', require('./routes/stats'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const frontendDist = path.join(__dirname, '..', 'frontend', 'build');
if (require('fs').existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`温泉度假区平台后端服务已启动: http://localhost:${PORT}`);
});
