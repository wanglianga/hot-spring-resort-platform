const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { poolId } = req.query;
  let query = 'SELECT * FROM disinfection_records WHERE 1=1';
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
  const { poolId, disinfectantType, amount, operatorId, operatorName, notes } = req.body;
  if (!poolId || !disinfectantType || amount === undefined || !operatorId || !operatorName) {
    return res.status(400).json({ error: '汤池ID、消毒剂类型、用量和操作人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO disinfection_records (id, pool_id, disinfectant_type, amount, operator_id, operator_name, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, poolId, disinfectantType, amount, operatorId, operatorName, notes || '', now);
  const record = db.prepare('SELECT * FROM disinfection_records WHERE id = ?').get(id);
  res.status(201).json(record);
});

module.exports = router;
