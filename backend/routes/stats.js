const express = require('express');
const db = require('../database');

const router = express.Router();

router.get('/overview', (req, res) => {
  const poolStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
      SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count,
      SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_count
    FROM pools
  `).get();

  const today = new Date().toISOString().split('T')[0];
  const todayComplaints = db.prepare(`
    SELECT COUNT(*) as count FROM complaints WHERE DATE(created_at) = ?
  `).get(today).count;

  const pendingComplaints = db.prepare(`
    SELECT COUNT(*) as count FROM complaints WHERE status = 'pending'
  `).get().count;

  const pendingMaintenance = db.prepare(`
    SELECT COUNT(*) as count FROM maintenance_records WHERE status = 'pending'
  `).get().count;

  const pendingCompensations = db.prepare(`
    SELECT COUNT(*) as count FROM compensations WHERE status = 'pending'
  `).get().count;

  const todayPatrols = db.prepare(`
    SELECT COUNT(*) as count FROM patrol_records WHERE DATE(created_at) = ?
  `).get(today).count;

  res.json({
    pools: poolStats,
    todayComplaints,
    pendingComplaints,
    pendingMaintenance,
    pendingCompensations,
    todayPatrols
  });
});

router.get('/pool/:poolId', (req, res) => {
  const poolId = req.params.poolId;
  const waterQuality = db.prepare(`
    SELECT * FROM water_quality_records WHERE pool_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(poolId);

  const disinfection = db.prepare(`
    SELECT * FROM disinfection_records WHERE pool_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(poolId);

  const supplements = db.prepare(`
    SELECT * FROM mineral_supplements WHERE pool_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(poolId);

  const drainage = db.prepare(`
    SELECT * FROM drainage_records WHERE pool_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(poolId);

  const maintenance = db.prepare(`
    SELECT * FROM maintenance_records WHERE pool_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(poolId);

  const closures = db.prepare(`
    SELECT * FROM pool_closures WHERE pool_id = ? ORDER BY closed_at DESC LIMIT 10
  `).all(poolId);

  const patrols = db.prepare(`
    SELECT * FROM patrol_records WHERE pool_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(poolId);

  const complaints = db.prepare(`
    SELECT * FROM complaints WHERE pool_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(poolId);

  res.json({
    waterQuality,
    disinfection,
    supplements,
    drainage,
    maintenance,
    closures,
    patrols,
    complaints
  });
});

module.exports = router;
