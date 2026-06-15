const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { complaintId, status } = req.query;
  let query = 'SELECT * FROM compensations WHERE 1=1';
  const params = [];
  if (complaintId) {
    query += ' AND complaint_id = ?';
    params.push(complaintId);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC LIMIT 100';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

router.post('/', (req, res) => {
  const { complaintId, amount, compensationMethod, planDescription, approverId, approverName, operatorId, operatorName } = req.body;
  if (!complaintId || amount === undefined || !compensationMethod || !operatorId || !operatorName) {
    return res.status(400).json({ error: '投诉ID、赔付金额、赔付方式和操作人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO compensations (
      id, complaint_id, amount, compensation_method, plan_description,
      status, approver_id, approver_name, operator_id, operator_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
  `).run(
    id, complaintId, amount, compensationMethod, planDescription || '',
    approverId || null, approverName || '', operatorId, operatorName, now, now
  );
  const record = db.prepare('SELECT * FROM compensations WHERE id = ?').get(id);
  res.status(201).json(record);
});

router.put('/:id', (req, res) => {
  const { status, approverId, approverName } = req.body;
  const record = db.prepare('SELECT * FROM compensations WHERE id = ?').get(req.params.id);
  if (!record) {
    return res.status(404).json({ error: '赔付记录不存在' });
  }
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE compensations SET
      status = COALESCE(?, status),
      approver_id = COALESCE(?, approver_id),
      approver_name = COALESCE(?, approver_name),
      updated_at = ?
    WHERE id = ?
  `).run(status, approverId, approverName, now, req.params.id);
  const updated = db.prepare('SELECT * FROM compensations WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;
