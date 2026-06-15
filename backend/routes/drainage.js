const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { poolId } = req.query;
  let query = 'SELECT * FROM drainage_records WHERE 1=1';
  const params = [];
  if (poolId) {
    query += ' AND pool_id = ?';
    params.push(poolId);
  }
  query += ' ORDER BY created_at DESC LIMIT 100';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

router.post('/', (req, res) => {
  const { poolId, durationMinutes, waterVolume, operatorId, operatorName, notes } = req.body;
  if (!poolId || !durationMinutes || !operatorId || !operatorName) {
    return res.status(400).json({ error: '汤池ID、排污时长和操作人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO drainage_records (id, pool_id, duration_minutes, water_volume, operator_id, operator_name, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, poolId, durationMinutes, waterVolume || null, operatorId, operatorName, notes || '', now);
  const record = db.prepare('SELECT * FROM drainage_records WHERE id = ?').get(id);
  res.status(201).json(record);
});

module.exports = router;
