const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { poolId, status } = req.query;
  let query = 'SELECT * FROM pool_abnormal_reports WHERE 1=1';
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
  const record = db.prepare('SELECT * FROM pool_abnormal_reports WHERE id = ?').get(req.params.id);
  if (!record) {
    return res.status(404).json({ error: '异常报告不存在' });
  }
  const decisions = db.prepare('SELECT * FROM pool_abnormal_decisions WHERE report_id = ? ORDER BY created_at DESC').all(req.params.id);
  const notifications = db.prepare('SELECT * FROM guest_notifications WHERE report_id = ? ORDER BY notified_at DESC').all(req.params.id);
  const retests = db.prepare('SELECT * FROM retest_records WHERE report_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...record, decisions, notifications, retests });
});

router.post('/', (req, res) => {
  const {
    poolId, abnormalType, temperature, waterLevel, mineralLevel,
    foamLevel, readingData, photoUrl, operatorId, operatorName, notes
  } = req.body;
  if (!poolId || !abnormalType || !operatorId || !operatorName || !readingData || !photoUrl) {
    return res.status(400).json({ error: '汤池ID、异常类型、读数数据、现场照片URL和操作人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO pool_abnormal_reports (
      id, pool_id, abnormal_type, temperature, water_level, mineral_level,
      foam_level, reading_data, photo_url, status, operator_id, operator_name,
      notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, poolId, abnormalType, temperature || null, waterLevel || null, mineralLevel || null,
    foamLevel || '', readingData || '', photoUrl || '', 'pending', operatorId, operatorName,
    notes || '', now, now
  );
  const record = db.prepare('SELECT * FROM pool_abnormal_reports WHERE id = ?').get(id);
  res.status(201).json(record);
});

router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  const record = db.prepare('SELECT * FROM pool_abnormal_reports WHERE id = ?').get(req.params.id);
  if (!record) {
    return res.status(404).json({ error: '异常报告不存在' });
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE pool_abnormal_reports SET status = ?, updated_at = ? WHERE id = ?').run(status, now, req.params.id);
  const updated = db.prepare('SELECT * FROM pool_abnormal_reports WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;
