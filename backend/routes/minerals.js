const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { poolId } = req.query;
  let query = 'SELECT * FROM mineral_supplements WHERE 1=1';
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
  const { poolId, mineralType, amount, operatorId, operatorName, notes } = req.body;
  if (!poolId || !mineralType || amount === undefined || !operatorId || !operatorName) {
    return res.status(400).json({ error: '汤池ID、矿物质类型、用量和操作人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO mineral_supplements (id, pool_id, mineral_type, amount, operator_id, operator_name, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, poolId, mineralType, amount, operatorId, operatorName, notes || '', now);
  const record = db.prepare('SELECT * FROM mineral_supplements WHERE id = ?').get(id);
  res.status(201).json(record);
});

module.exports = router;
