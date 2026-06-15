const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { poolId } = req.query;
  let query = 'SELECT * FROM water_quality_records WHERE 1=1';
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
  const { poolId, temperature, turbidity, ph, disinfectionType, disinfectionAmount, operatorId, operatorName, notes } = req.body;
  if (!poolId || temperature === undefined || turbidity === undefined || !operatorId || !operatorName) {
    return res.status(400).json({ error: '汤池ID、水温、浊度和操作人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO water_quality_records (id, pool_id, temperature, turbidity, ph, disinfection_type, disinfection_amount, operator_id, operator_name, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, poolId, temperature, turbidity, ph || null, disinfectionType || '', disinfectionAmount || null, operatorId, operatorName, notes || '', now);
  db.prepare('UPDATE pools SET temperature = ?, updated_at = ? WHERE id = ?').run(temperature, now, poolId);
  const record = db.prepare('SELECT * FROM water_quality_records WHERE id = ?').get(id);
  res.status(201).json(record);
});

module.exports = router;
