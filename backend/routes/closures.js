const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { poolId, active } = req.query;
  let query = 'SELECT * FROM pool_closures WHERE 1=1';
  const params = [];
  if (poolId) {
    query += ' AND pool_id = ?';
    params.push(poolId);
  }
  if (active === 'true') {
    query += ' AND reopened_at IS NULL';
  }
  query += ' ORDER BY closed_at DESC LIMIT 100';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

router.post('/', (req, res) => {
  const { poolId, reason, operatorId, operatorName, notes } = req.body;
  if (!poolId || !reason || !operatorId || !operatorName) {
    return res.status(400).json({ error: '汤池ID、闭池原因和操作人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO pool_closures (id, pool_id, reason, closed_at, operator_id, operator_name, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, poolId, reason, now, operatorId, operatorName, notes || '');
  db.prepare("UPDATE pools SET status = 'closed', updated_at = ? WHERE id = ?").run(now, poolId);
  const record = db.prepare('SELECT * FROM pool_closures WHERE id = ?').get(id);
  res.status(201).json(record);
});

router.post('/:id/reopen', (req, res) => {
  const record = db.prepare('SELECT * FROM pool_closures WHERE id = ?').get(req.params.id);
  if (!record) {
    return res.status(404).json({ error: '闭池记录不存在' });
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE pool_closures SET reopened_at = ? WHERE id = ?').run(now, req.params.id);
  db.prepare("UPDATE pools SET status = 'open', updated_at = ? WHERE id = ?").run(now, record.pool_id);
  const updated = db.prepare('SELECT * FROM pool_closures WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;
