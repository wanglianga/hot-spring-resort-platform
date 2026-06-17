const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { poolId, status } = req.query;
  let query = 'SELECT * FROM group_conflicts WHERE 1=1';
  const params = [];
  if (poolId) {
    query += ' AND pool_id = ?';
    params.push(poolId);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC LIMIT 100';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

router.get('/:id', (req, res) => {
  const record = db.prepare('SELECT * FROM group_conflicts WHERE id = ?').get(req.params.id);
  if (!record) {
    return res.status(404).json({ error: '冲突记录不存在' });
  }
  const adjustments = db.prepare('SELECT * FROM conflict_adjustments WHERE conflict_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...record, adjustments });
});

router.post('/', (req, res) => {
  const {
    poolId, groupName, groupPeopleCount, originalArrivalTime, actualArrivalTime,
    scheduledStartTime, scheduledEndTime, conflictReason, affectedWalkinCount,
    operatorId, operatorName, notes
  } = req.body;
  if (!poolId || !groupName || !originalArrivalTime || !scheduledStartTime || !scheduledEndTime || !conflictReason || !operatorId || !operatorName) {
    return res.status(400).json({ error: '汤池ID、团客名称、时间信息、冲突原因和操作人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO group_conflicts (
      id, pool_id, group_name, group_people_count, original_arrival_time,
      actual_arrival_time, scheduled_start_time, scheduled_end_time,
      conflict_reason, affected_walkin_count, status, operator_id,
      operator_name, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, poolId, groupName, groupPeopleCount || 0, originalArrivalTime,
    actualArrivalTime || null, scheduledStartTime, scheduledEndTime,
    conflictReason, affectedWalkinCount || 0, 'pending', operatorId,
    operatorName, notes || '', now, now
  );
  const record = db.prepare('SELECT * FROM group_conflicts WHERE id = ?').get(id);
  res.status(201).json(record);
});

router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  const record = db.prepare('SELECT * FROM group_conflicts WHERE id = ?').get(req.params.id);
  if (!record) {
    return res.status(404).json({ error: '冲突记录不存在' });
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE group_conflicts SET status = ?, updated_at = ? WHERE id = ?').run(status, now, req.params.id);
  const updated = db.prepare('SELECT * FROM group_conflicts WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.put('/:id/arrival', (req, res) => {
  const { actualArrivalTime } = req.body;
  const record = db.prepare('SELECT * FROM group_conflicts WHERE id = ?').get(req.params.id);
  if (!record) {
    return res.status(404).json({ error: '冲突记录不存在' });
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE group_conflicts SET actual_arrival_time = ?, updated_at = ? WHERE id = ?').run(actualArrivalTime, now, req.params.id);
  const updated = db.prepare('SELECT * FROM group_conflicts WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;
