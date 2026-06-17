const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { conflictId, poolId } = req.query;
  let query = 'SELECT * FROM conflict_adjustments WHERE 1=1';
  const params = [];
  if (conflictId) {
    query += ' AND conflict_id = ?';
    params.push(conflictId);
  }
  if (poolId) {
    query += ' AND pool_id = ?';
    params.push(poolId);
  }
  query += ' ORDER BY created_at DESC LIMIT 100';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

router.post('/', (req, res) => {
  const {
    conflictId, poolId, entryOrder, cateringArrangement, poolChangePlan,
    compensationAmount, compensationVouchers, walkinAgreed, finalPoolArrivalTime,
    complaintId, compensationId, receptionRhythm, operatorId, operatorName
  } = req.body;
  if (!conflictId || !poolId || !operatorId || !operatorName) {
    return res.status(400).json({ error: '冲突ID、汤池ID和操作人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO conflict_adjustments (
      id, conflict_id, pool_id, entry_order, catering_arrangement,
      pool_change_plan, compensation_amount, compensation_vouchers,
      walkin_agreed, final_pool_arrival_time, complaint_id, compensation_id,
      reception_rhythm, operator_id, operator_name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, conflictId, poolId, entryOrder || '', cateringArrangement || '',
    poolChangePlan || '', compensationAmount || 0, compensationVouchers || '',
    walkinAgreed ? 1 : 0, finalPoolArrivalTime || null, complaintId || null,
    compensationId || null, receptionRhythm || '', operatorId, operatorName, now
  );

  db.prepare('UPDATE group_conflicts SET status = ?, updated_at = ? WHERE id = ?').run('adjusted', now, conflictId);

  const record = db.prepare('SELECT * FROM conflict_adjustments WHERE id = ?').get(id);
  res.status(201).json(record);
});

module.exports = router;
