const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const MAINTENANCE_TYPES = {
  routine_disinfection: '例行消毒',
  equipment_inspection: '设备检查',
  mineral_supplement: '矿物质补充',
  pipe_cleaning: '管道清洗'
};

function getNextWeekdayDate(weekday, timeStr) {
  const now = new Date();
  const currentDay = now.getDay();
  let daysAhead = weekday - currentDay;
  if (daysAhead <= 0) daysAhead += 7;
  const target = new Date(now);
  target.setDate(now.getDate() + daysAhead);
  const [hours, minutes] = timeStr.split(':').map(Number);
  target.setHours(hours, minutes, 0, 0);
  return target;
}

function generateRemindersForPlan(plan) {
  const now = new Date();
  const scheduledDate = getNextWeekdayDate(plan.schedule_weekday, plan.schedule_time);
  const reminderTime = new Date(scheduledDate.getTime() - 2 * 60 * 60 * 1000);

  if (reminderTime <= now) return;

  const existing = db.prepare(
    "SELECT id FROM maintenance_reminders WHERE plan_id = ? AND scheduled_time = ? AND status = 'pending'"
  ).get(plan.id, scheduledDate.toISOString());
  if (existing) return;

  const reminderId = uuidv4();
  const poolName = db.prepare('SELECT name FROM pools WHERE id = ?').get(plan.pool_id)?.name || '';
  const typeName = MAINTENANCE_TYPES[plan.maintenance_type] || plan.maintenance_type;

  db.prepare(`
    INSERT INTO maintenance_reminders (id, plan_id, pool_id, reminder_time, scheduled_time, maintenance_type, message, target_roles, target_user_ids, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    reminderId, plan.id, plan.pool_id,
    reminderTime.toISOString(), scheduledDate.toISOString(),
    plan.maintenance_type,
    `【预防性维护提醒】${poolName} - ${typeName}，计划执行时间：${scheduledDate.toLocaleString('zh-CN')}`,
    plan.creator_role === 'water_quality' ? 'water_quality,engineering' : 'engineering,water_quality',
    plan.assignee_ids || plan.creator_id,
    now.toISOString()
  );
}

function updatePoolHealthProfile(poolId, execution) {
  let profile = db.prepare('SELECT * FROM pool_health_profiles WHERE pool_id = ?').get(poolId);
  const now = new Date().toISOString();
  if (!profile) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO pool_health_profiles (id, pool_id, total_running_hours, repair_count, water_quality_pass_count, water_quality_total_count, water_quality_pass_rate, health_score, last_score_update, created_at, updated_at)
      VALUES (?, ?, 0, 0, 0, 0, 100, 100, ?, ?, ?)
    `).run(id, poolId, now, now, now);
    profile = db.prepare('SELECT * FROM pool_health_profiles WHERE pool_id = ?').get(poolId);
  }

  let { total_running_hours, repair_count, water_quality_pass_count, water_quality_total_count } = profile;

  if (execution.actual_duration_minutes) {
    total_running_hours += execution.actual_duration_minutes / 60;
  }

  if (execution.abnormality_found) {
    repair_count += 1;
  }

  if (execution.readings_before && execution.readings_after) {
    try {
      const after = JSON.parse(execution.readings_after);
      water_quality_total_count += 1;
      const ph = after.ph;
      const turbidity = after.turbidity;
      const temperature = after.temperature;
      const phOk = ph >= 6.5 && ph <= 8.5;
      const turbidityOk = turbidity <= 5;
      const tempOk = temperature >= 35 && temperature <= 45;
      if (phOk && turbidityOk && tempOk) {
        water_quality_pass_count += 1;
      }
    } catch (e) {}
  }

  const passRate = water_quality_total_count > 0 ? (water_quality_pass_count / water_quality_total_count * 100) : 100;

  let score = 100;
  if (total_running_hours > 2000) score -= (total_running_hours - 2000) / 100;
  score -= repair_count * 3;
  score -= (100 - passRate) * 0.5;
  if (profile.last_deep_maintenance) {
    const lastDeep = new Date(profile.last_deep_maintenance);
    const daysSince = (Date.now() - lastDeep.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 90) score -= (daysSince - 90) * 0.1;
  }
  score = Math.max(0, Math.min(100, Math.round(score * 10) / 10));

  db.prepare(`
    UPDATE pool_health_profiles SET
      total_running_hours = ?,
      repair_count = ?,
      water_quality_pass_count = ?,
      water_quality_total_count = ?,
      water_quality_pass_rate = ?,
      health_score = ?,
      last_score_update = ?,
      updated_at = ?
    WHERE pool_id = ?
  `).run(total_running_hours, repair_count, water_quality_pass_count, water_quality_total_count, passRate, score, now, now, poolId);
}

router.get('/plans', (req, res) => {
  const { poolId, status, maintenanceType } = req.query;
  let query = 'SELECT * FROM preventive_maintenance_plans WHERE 1=1';
  const params = [];
  if (poolId) { query += ' AND pool_id = ?'; params.push(poolId); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (maintenanceType) { query += ' AND maintenance_type = ?'; params.push(maintenanceType); }
  query += ' ORDER BY schedule_weekday, schedule_time';
  const plans = db.prepare(query).all(...params);
  res.json(plans);
});

router.post('/plans', (req, res) => {
  const {
    poolId, planName, maintenanceType, scheduleWeekday, scheduleTime,
    description, estimatedDurationMinutes, creatorId, creatorName, creatorRole,
    assigneeIds, assigneeNames
  } = req.body;
  if (!poolId || !planName || !maintenanceType || scheduleWeekday === undefined || !scheduleTime || !creatorId || !creatorName || !creatorRole) {
    return res.status(400).json({ error: '汤池、计划名称、维护类型、计划时间和创建人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO preventive_maintenance_plans (
      id, pool_id, plan_name, maintenance_type, schedule_weekday, schedule_time,
      description, estimated_duration_minutes, status, creator_id, creator_name,
      creator_role, assignee_ids, assignee_names, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, poolId, planName, maintenanceType, scheduleWeekday, scheduleTime,
    description || '', estimatedDurationMinutes || 60, creatorId, creatorName,
    creatorRole, assigneeIds || '', assigneeNames || '', now, now
  );

  const plan = db.prepare('SELECT * FROM preventive_maintenance_plans WHERE id = ?').get(id);
  generateRemindersForPlan(plan);

  res.status(201).json(plan);
});

router.put('/plans/:id', (req, res) => {
  const plan = db.prepare('SELECT * FROM preventive_maintenance_plans WHERE id = ?').get(req.params.id);
  if (!plan) return res.status(404).json({ error: '维护计划不存在' });

  const { planName, maintenanceType, scheduleWeekday, scheduleTime, description, estimatedDurationMinutes, status, assigneeIds, assigneeNames } = req.body;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE preventive_maintenance_plans SET
      plan_name = COALESCE(?, plan_name),
      maintenance_type = COALESCE(?, maintenance_type),
      schedule_weekday = COALESCE(?, schedule_weekday),
      schedule_time = COALESCE(?, schedule_time),
      description = COALESCE(?, description),
      estimated_duration_minutes = COALESCE(?, estimated_duration_minutes),
      status = COALESCE(?, status),
      assignee_ids = COALESCE(?, assignee_ids),
      assignee_names = COALESCE(?, assignee_names),
      updated_at = ?
    WHERE id = ?
  `).run(planName, maintenanceType, scheduleWeekday, scheduleTime, description, estimatedDurationMinutes, status, assigneeIds, assigneeNames, now, req.params.id);

  const updated = db.prepare('SELECT * FROM preventive_maintenance_plans WHERE id = ?').get(req.params.id);
  if (status === 'active') generateRemindersForPlan(updated);
  res.json(updated);
});

router.delete('/plans/:id', (req, res) => {
  const plan = db.prepare('SELECT * FROM preventive_maintenance_plans WHERE id = ?').get(req.params.id);
  if (!plan) return res.status(404).json({ error: '维护计划不存在' });
  db.prepare("UPDATE maintenance_reminders SET status = 'cancelled' WHERE plan_id = ? AND status = 'pending'").run(req.params.id);
  db.prepare("UPDATE preventive_maintenance_plans SET status = 'inactive', updated_at = ? WHERE id = ?").run(new Date().toISOString(), req.params.id);
  res.json({ message: '计划已停用' });
});

router.get('/executions', (req, res) => {
  const { poolId, planId, status } = req.query;
  let query = 'SELECT * FROM preventive_maintenance_executions WHERE 1=1';
  const params = [];
  if (poolId) { query += ' AND pool_id = ?'; params.push(poolId); }
  if (planId) { query += ' AND plan_id = ?'; params.push(planId); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY scheduled_time DESC LIMIT 100';
  const executions = db.prepare(query).all(...params);
  res.json(executions);
});

router.post('/executions', (req, res) => {
  const {
    planId, poolId, maintenanceType, scheduledTime, operatorId, operatorName, notes
  } = req.body;
  if (!planId || !poolId || !maintenanceType || !scheduledTime || !operatorId || !operatorName) {
    return res.status(400).json({ error: '计划ID、汤池、维护类型、计划时间和操作人信息为必填项' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO preventive_maintenance_executions (
      id, plan_id, pool_id, maintenance_type, scheduled_time, operator_id, operator_name,
      status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `).run(id, planId, poolId, maintenanceType, scheduledTime, operatorId, operatorName, notes || '', now, now);

  const execution = db.prepare('SELECT * FROM preventive_maintenance_executions WHERE id = ?').get(id);
  res.status(201).json(execution);
});

router.put('/executions/:id/start', (req, res) => {
  const execution = db.prepare('SELECT * FROM preventive_maintenance_executions WHERE id = ?').get(req.params.id);
  if (!execution) return res.status(404).json({ error: '执行记录不存在' });

  const { readingsBefore } = req.body;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE preventive_maintenance_executions SET
      status = 'in_progress', actual_start_time = ?, readings_before = ?, updated_at = ?
    WHERE id = ?
  `).run(now, readingsBefore || '', now, req.params.id);

  const updated = db.prepare('SELECT * FROM preventive_maintenance_executions WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.put('/executions/:id/complete', (req, res) => {
  const execution = db.prepare('SELECT * FROM preventive_maintenance_executions WHERE id = ?').get(req.params.id);
  if (!execution) return res.status(404).json({ error: '执行记录不存在' });

  const {
    actualEndTime, actualDurationMinutes, readingsAfter,
    abnormalityFound, abnormalityDescription, notes
  } = req.body;
  const now = new Date().toISOString();
  const endTime = actualEndTime || now;
  const startTime = execution.actual_start_time || now;
  const duration = actualDurationMinutes || Math.round((new Date(endTime) - new Date(startTime)) / 60000);

  let abnormalReportId = null;
  let closureId = null;

  if (abnormalityFound) {
    const reportId = uuidv4();
    const readingsBefore = execution.readings_before || '{}';
    const readingData = JSON.stringify({
      before: readingsBefore,
      after: readingsAfter || '{}',
      abnormality: abnormalityDescription
    });
    db.prepare(`
      INSERT INTO pool_abnormal_reports (
        id, pool_id, abnormal_type, reading_data, status, operator_id, operator_name,
        notes, created_at, updated_at
      ) VALUES (?, ?, 'maintenance_abnormal', ?, 'pending', ?, ?, ?, ?, ?)
    `).run(
      reportId, execution.pool_id, readingData,
      execution.operator_id, execution.operator_name,
      `预防性维护发现异常：${abnormalityDescription}`, now, now
    );
    abnormalReportId = reportId;

    const closureIdNew = uuidv4();
    db.prepare(`
      INSERT INTO pool_closures (id, pool_id, reason, closed_at, operator_id, operator_name, notes)
      VALUES (?, ?, '维护异常闭池', ?, ?, ?, ?)
    `).run(
      closureIdNew, execution.pool_id, now,
      execution.operator_id, execution.operator_name,
      `预防性维护发现异常自动闭池：${abnormalityDescription}`
    );
    db.prepare("UPDATE pools SET status = 'closed', updated_at = ? WHERE id = ?").run(now, execution.pool_id);
    closureId = closureIdNew;

    const reminderId = uuidv4();
    db.prepare(`
      INSERT INTO maintenance_reminders (id, plan_id, pool_id, reminder_time, scheduled_time, maintenance_type, message, target_roles, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'abnormal_closure', ?, 'engineering,admin', 'sent', ?)
    `).run(
      reminderId, execution.plan_id, execution.pool_id, now, now,
      `【紧急】${execution.pool_id} 维护发现异常已自动闭池：${abnormalityDescription}`,
      now
    );
  }

  db.prepare(`
    UPDATE preventive_maintenance_executions SET
      status = 'completed',
      actual_end_time = ?,
      actual_duration_minutes = ?,
      readings_after = ?,
      abnormality_found = ?,
      abnormality_description = ?,
      abnormal_report_id = ?,
      closure_id = ?,
      notes = COALESCE(?, notes),
      updated_at = ?
    WHERE id = ?
  `).run(
    endTime, duration, readingsAfter || '',
    abnormalityFound ? 1 : 0, abnormalityDescription || '',
    abnormalReportId, closureId, notes, now, req.params.id
  );

  const completedExec = { ...execution, actual_duration_minutes: duration, abnormality_found: abnormalityFound ? 1 : 0 };
  updatePoolHealthProfile(execution.pool_id, completedExec);

  const updated = db.prepare('SELECT * FROM preventive_maintenance_executions WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.get('/reminders', (req, res) => {
  const { role, userId, status, poolId } = req.query;
  let query = 'SELECT * FROM maintenance_reminders WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (poolId) { query += ' AND pool_id = ?'; params.push(poolId); }
  if (role) { query += ' AND target_roles LIKE ?'; params.push(`%${role}%`); }
  if (userId) { query += ' AND (target_user_ids LIKE ? OR target_user_ids = \'\')'; params.push(`%${userId}%`); }
  query += ' ORDER BY reminder_time ASC LIMIT 50';
  const reminders = db.prepare(query).all(...params);

  const now = new Date();
  reminders.forEach(r => {
    if (r.status === 'pending' && new Date(r.reminder_time) <= now) {
      db.prepare("UPDATE maintenance_reminders SET status = 'sent' WHERE id = ?").run(r.id);
      r.status = 'sent';
    }
  });

  res.json(reminders);
});

router.put('/reminders/:id/read', (req, res) => {
  const reminder = db.prepare('SELECT * FROM maintenance_reminders WHERE id = ?').get(req.params.id);
  if (!reminder) return res.status(404).json({ error: '提醒不存在' });
  db.prepare('UPDATE maintenance_reminders SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: '已标记已读' });
});

router.get('/health-profiles', (req, res) => {
  const { poolId, lowScore } = req.query;
  let query = 'SELECT h.*, p.name as pool_name, p.zone, p.status as pool_status FROM pool_health_profiles h LEFT JOIN pools p ON h.pool_id = p.id WHERE 1=1';
  const params = [];
  if (poolId) { query += ' AND h.pool_id = ?'; params.push(poolId); }
  if (lowScore) { query += ' AND h.health_score < ?'; params.push(Number(lowScore)); }
  query += ' ORDER BY h.health_score ASC';
  const profiles = db.prepare(query).all(...params);
  res.json(profiles);
});

router.get('/health-profiles/:poolId', (req, res) => {
  const profile = db.prepare(`
    SELECT h.*, p.name as pool_name, p.zone, p.status as pool_status
    FROM pool_health_profiles h LEFT JOIN pools p ON h.pool_id = p.id
    WHERE h.pool_id = ?
  `).get(req.params.poolId);
  if (!profile) return res.status(404).json({ error: '健康档案不存在' });

  const executions = db.prepare(`
    SELECT * FROM preventive_maintenance_executions WHERE pool_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(req.params.poolId);

  const recentReminders = db.prepare(`
    SELECT * FROM maintenance_reminders WHERE pool_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(req.params.poolId);

  res.json({ ...profile, executions, recentReminders });
});

router.post('/health-profiles/:poolId/deep-maintenance', (req, res) => {
  const { operatorId, operatorName, notes } = req.body;
  if (!operatorId || !operatorName) {
    return res.status(400).json({ error: '操作人信息为必填项' });
  }
  const profile = db.prepare('SELECT * FROM pool_health_profiles WHERE pool_id = ?').get(req.params.poolId);
  if (!profile) return res.status(404).json({ error: '健康档案不存在' });

  const now = new Date().toISOString();
  let newScore = Math.min(100, profile.health_score + 15);
  newScore = Math.round(newScore * 10) / 10;

  db.prepare(`
    UPDATE pool_health_profiles SET
      last_deep_maintenance = ?,
      health_score = ?,
      updated_at = ?
    WHERE pool_id = ?
  `).run(now, newScore, now, req.params.poolId);

  const updated = db.prepare('SELECT * FROM pool_health_profiles WHERE pool_id = ?').get(req.params.poolId);
  res.json(updated);
});

router.post('/generate-reminders', (req, res) => {
  const plans = db.prepare("SELECT * FROM preventive_maintenance_plans WHERE status = 'active'").all();
  let count = 0;
  plans.forEach(plan => {
    const before = db.prepare("SELECT COUNT(*) as c FROM maintenance_reminders WHERE plan_id = ? AND status = 'pending'").get(plan.id).c;
    generateRemindersForPlan(plan);
    const after = db.prepare("SELECT COUNT(*) as c FROM maintenance_reminders WHERE plan_id = ? AND status = 'pending'").get(plan.id).c;
    if (after > before) count++;
  });
  res.json({ message: `已为 ${count} 个计划生成提醒`, count });
});

router.get('/dashboard-alerts', (req, res) => {
  const { role } = req.query;
  const now = new Date().toISOString();

  let reminderQuery = "SELECT * FROM maintenance_reminders WHERE status IN ('pending', 'sent') AND is_read = 0";
  const params = [];
  if (role) { reminderQuery += ' AND target_roles LIKE ?'; params.push(`%${role}%`); }
  reminderQuery += ' ORDER BY reminder_time ASC LIMIT 10';
  const reminders = db.prepare(reminderQuery).all(...params);

  const lowScoreProfiles = db.prepare(`
    SELECT h.*, p.name as pool_name FROM pool_health_profiles h
    LEFT JOIN pools p ON h.pool_id = p.id
    WHERE h.health_score < 60
    ORDER BY h.health_score ASC
  `).all();

  const pendingExecutions = db.prepare(`
    SELECT e.*, p.name as pool_name FROM preventive_maintenance_executions e
    LEFT JOIN pools p ON e.pool_id = p.id
    WHERE e.status IN ('pending', 'in_progress')
    ORDER BY e.scheduled_time ASC LIMIT 10
  `).all();

  res.json({ reminders, lowScoreProfiles, pendingExecutions });
});

module.exports = router;
