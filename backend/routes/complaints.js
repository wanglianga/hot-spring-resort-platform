const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { poolId, status, zone } = req.query;
  let query = 'SELECT * FROM complaints WHERE 1=1';
  const params = [];
  if (poolId) {
    query += ' AND pool_id = ?';
    params.push(poolId);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (zone) {
    query += ' AND zone = ?';
    params.push(zone);
  }
  query += ' ORDER BY created_at DESC LIMIT 100';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

router.get('/:id', (req, res) => {
  const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id);
  if (!complaint) {
    return res.status(404).json({ error: '投诉记录不存在' });
  }
  const compensations = db.prepare('SELECT * FROM compensations WHERE complaint_id = ?').all(req.params.id);
  res.json({ ...complaint, compensations });
});

router.post('/', (req, res) => {
  const {
    poolId, zone, monitorPoint, customerName, customerPhone,
    complaintType, description, rescueInvolved, handlerId, handlerName
  } = req.body;
  if (!complaintType || !description) {
    return res.status(400).json({ error: '投诉类型和描述为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO complaints (
      id, pool_id, zone, monitor_point, customer_name, customer_phone,
      complaint_type, description, rescue_involved, status, handler_id, handler_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
  `).run(
    id, poolId || null, zone || '', monitorPoint || '', customerName || '', customerPhone || '',
    complaintType, description, rescueInvolved ? 1 : 0, handlerId || null, handlerName || '', now, now
  );
  const record = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
  res.status(201).json(record);
});

router.put('/:id', (req, res) => {
  const { status, handlerId, handlerName } = req.body;
  const record = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id);
  if (!record) {
    return res.status(404).json({ error: '投诉记录不存在' });
  }
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE complaints SET
      status = COALESCE(?, status),
      handler_id = COALESCE(?, handler_id),
      handler_name = COALESCE(?, handler_name),
      updated_at = ?
    WHERE id = ?
  `).run(status, handlerId, handlerName, now, req.params.id);
  const updated = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;
