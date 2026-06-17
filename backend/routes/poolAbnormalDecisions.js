const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { reportId, poolId } = req.query;
  let query = 'SELECT * FROM pool_abnormal_decisions WHERE 1=1';
  const params = [];
  if (reportId) {
    query += ' AND report_id = ?';
    params.push(reportId);
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
  const { reportId, poolId, decisionType, affectedPeopleCount, operatorId, operatorName, notes } = req.body;
  if (!reportId || !poolId || !decisionType || !operatorId || !operatorName) {
    return res.status(400).json({ error: '报告ID、汤池ID、决策类型和操作人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO pool_abnormal_decisions (
      id, report_id, pool_id, decision_type, affected_people_count,
      operator_id, operator_name, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, reportId, poolId, decisionType, affectedPeopleCount || 0,
    operatorId, operatorName, notes || '', now
  );

  if (decisionType === 'closure') {
    db.prepare("UPDATE pools SET status = 'closed', updated_at = ? WHERE id = ?").run(now, poolId);
    db.prepare(`
      INSERT INTO pool_closures (id, pool_id, reason, closed_at, operator_id, operator_name, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), poolId, '异常闭池-' + decisionType, now, operatorId, operatorName, notes || '');
  } else if (decisionType === 'maintenance') {
    db.prepare("UPDATE pools SET status = 'maintenance', updated_at = ? WHERE id = ?").run(now, poolId);
  }

  db.prepare('UPDATE pool_abnormal_reports SET status = ?, updated_at = ? WHERE id = ?').run('processed', now, reportId);

  const record = db.prepare('SELECT * FROM pool_abnormal_decisions WHERE id = ?').get(id);
  res.status(201).json(record);
});

module.exports = router;
