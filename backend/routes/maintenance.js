const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { poolId, status, assigneeId } = req.query;
  let query = 'SELECT * FROM maintenance_records WHERE 1=1';
  const params = [];
  if (poolId) {
    query += ' AND pool_id = ?';
    params.push(poolId);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (assigneeId) {
    query += ' AND assignee_id = ?';
    params.push(assigneeId);
  }
  query += ' ORDER BY created_at DESC LIMIT 100';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

router.post('/', (req, res) => {
  const { poolId, equipmentType, issueDescription, priority, assigneeId, assigneeName, operatorId, operatorName } = req.body;
  if (!equipmentType || !issueDescription || !operatorId || !operatorName) {
    return res.status(400).json({ error: '设备类型、问题描述和操作人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO maintenance_records (id, pool_id, equipment_type, issue_description, status, priority, assignee_id, assignee_name, operator_id, operator_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
  `).run(id, poolId || null, equipmentType, issueDescription, priority || 'normal', assigneeId || null, assigneeName || '', operatorId, operatorName, now, now);
  const record = db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(id);
  res.status(201).json(record);
});

router.put('/:id', (req, res) => {
  const { status, assigneeId, assigneeName, resolution } = req.body;
  const record = db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(req.params.id);
  if (!record) {
    return res.status(404).json({ error: '维修记录不存在' });
  }
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE maintenance_records SET
      status = COALESCE(?, status),
      assignee_id = COALESCE(?, assignee_id),
      assignee_name = COALESCE(?, assignee_name),
      resolution = COALESCE(?, resolution),
      updated_at = ?
    WHERE id = ?
  `).run(status, assigneeId, assigneeName, resolution, now, req.params.id);
  const updated = db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;
