const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { reportId, poolId, targetRole } = req.query;
  let query = 'SELECT * FROM guest_notifications WHERE 1=1';
  const params = [];
  if (reportId) {
    query += ' AND report_id = ?';
    params.push(reportId);
  }
  if (poolId) {
    query += ' AND pool_id = ?';
    params.push(poolId);
  }
  if (targetRole) {
    query += ' AND target_role = ?';
    params.push(targetRole);
  }
  query += ' ORDER BY notified_at DESC LIMIT 100';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

router.post('/', (req, res) => {
  const {
    reportId, poolId, notificationType, targetRole, affectedPeopleCount,
    reassignmentPlan, messageContent, operatorId, operatorName
  } = req.body;
  if (!notificationType || !targetRole || !operatorId || !operatorName) {
    return res.status(400).json({ error: '通知类型、目标角色和操作人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO guest_notifications (
      id, report_id, pool_id, notification_type, target_role,
      affected_people_count, reassignment_plan, message_content,
      operator_id, operator_name, notified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, reportId || null, poolId || null, notificationType, targetRole,
    affectedPeopleCount || 0, reassignmentPlan || '', messageContent || '',
    operatorId, operatorName, now
  );
  const record = db.prepare('SELECT * FROM guest_notifications WHERE id = ?').get(id);
  res.status(201).json(record);
});

module.exports = router;
