const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { poolId, zone } = req.query;
  let query = 'SELECT * FROM patrol_records WHERE 1=1';
  const params = [];
  if (poolId) {
    query += ' AND pool_id = ?';
    params.push(poolId);
  }
  if (zone) {
    query += ' AND zone = ?';
    params.push(zone);
  }
  query += ' ORDER BY created_at DESC LIMIT 100';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

router.post('/', (req, res) => {
  const { poolId, zone, visitorDensity, reminders, issuesFound, operatorId, operatorName, notes } = req.body;
  if (!zone || !visitorDensity || !operatorId || !operatorName) {
    return res.status(400).json({ error: '区域、游客密度和操作人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO patrol_records (id, pool_id, zone, visitor_density, reminders, issues_found, operator_id, operator_name, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, poolId || null, zone, visitorDensity, reminders || '', issuesFound || '', operatorId, operatorName, notes || '', now);
  const record = db.prepare('SELECT * FROM patrol_records WHERE id = ?').get(id);
  res.status(201).json(record);
});

module.exports = router;
