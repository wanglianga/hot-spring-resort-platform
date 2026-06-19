import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space,
  Typography, Tag, Tabs, Descriptions, Progress, Badge, Tooltip, message, Popconfirm, Row, Col
} from 'antd';
import {
  PlusOutlined, CheckCircleOutlined, PlayCircleOutlined,
  ExclamationCircleOutlined, BellOutlined, HeartOutlined,
  ScheduleOutlined, ToolOutlined, AlertOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { preventiveMaintenanceApi, poolsApi, usersApi } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const MAINTENANCE_TYPE_MAP = {
  routine_disinfection: { text: '例行消毒', color: 'blue' },
  equipment_inspection: { text: '设备检查', color: 'green' },
  mineral_supplement: { text: '矿物质补充', color: 'purple' },
  pipe_cleaning: { text: '管道清洗', color: 'cyan' }
};

const EXECUTION_STATUS_MAP = {
  pending: { text: '待执行', color: 'orange' },
  in_progress: { text: '执行中', color: 'blue' },
  completed: { text: '已完成', color: 'green' }
};

export default function PreventiveMaintenance() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [healthProfiles, setHealthProfiles] = useState([]);
  const [pools, setPools] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editPlanModalOpen, setEditPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [executeModalOpen, setExecuteModalOpen] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [readingsModalOpen, setReadingsModalOpen] = useState(false);
  const [deepMaintenanceModalOpen, setDeepMaintenanceModalOpen] = useState(false);
  const [selectedHealthPool, setSelectedHealthPool] = useState(null);

  const [planForm] = Form.useForm();
  const [editPlanForm] = Form.useForm();
  const [executeForm] = Form.useForm();
  const [readingsForm] = Form.useForm();
  const [deepMaintenanceForm] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, poolsRes, usersRes, execRes, remindersRes, healthRes] = await Promise.all([
        preventiveMaintenanceApi.listPlans(),
        poolsApi.list(),
        usersApi.list({ role: 'engineering' }),
        preventiveMaintenanceApi.listExecutions(),
        preventiveMaintenanceApi.listReminders({ role: currentUser?.role }),
        preventiveMaintenanceApi.listHealthProfiles()
      ]);
      setPlans(plansRes.data);
      setPools(poolsRes.data);
      setEngineers(usersRes.data);
      setExecutions(execRes.data);
      setReminders(remindersRes.data);
      setHealthProfiles(healthRes.data);
    } catch (err) {
      console.error('加载数据失败', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const poolMap = Object.fromEntries(pools.map(p => [p.id, p.name]));

  const handleCreatePlan = async (values) => {
    try {
      const assigneeIds = values.assigneeIds?.join(',') || '';
      const assigneeNames = values.assigneeIds?.map(id => engineers.find(e => e.id === id)?.name).filter(Boolean).join(',') || '';
      await preventiveMaintenanceApi.createPlan({
        ...values,
        creatorId: currentUser.id,
        creatorName: currentUser.name,
        creatorRole: currentUser.role,
        assigneeIds,
        assigneeNames
      });
      message.success('维护计划创建成功');
      setPlanModalOpen(false);
      planForm.resetFields();
      loadData();
    } catch (err) {
      message.error('创建失败');
    }
  };

  const handleEditPlan = async (values) => {
    try {
      const assigneeIds = values.assigneeIds?.join(',') || '';
      const assigneeNames = values.assigneeIds?.map(id => engineers.find(e => e.id === id)?.name).filter(Boolean).join(',') || '';
      await preventiveMaintenanceApi.updatePlan(selectedPlan.id, {
        ...values,
        assigneeIds,
        assigneeNames
      });
      message.success('计划更新成功');
      setEditPlanModalOpen(false);
      setSelectedPlan(null);
      loadData();
    } catch (err) {
      message.error('更新失败');
    }
  };

  const handleDeletePlan = async (planId) => {
    try {
      await preventiveMaintenanceApi.deletePlan(planId);
      message.success('计划已停用');
      loadData();
    } catch (err) {
      message.error('停用失败');
    }
  };

  const handleStartExecution = async () => {
    try {
      const exec = selectedExecution;
      await preventiveMaintenanceApi.startExecution(exec.id, {
        readingsBefore: JSON.stringify({
          temperature: executeForm.getFieldValue('temperature_before'),
          turbidity: executeForm.getFieldValue('turbidity_before'),
          ph: executeForm.getFieldValue('ph_before')
        })
      });
      message.success('维护已开始执行');
      setExecuteModalOpen(false);
      setSelectedExecution(null);
      executeForm.resetFields();
      loadData();
    } catch (err) {
      message.error('启动失败');
    }
  };

  const handleCompleteExecution = async (values) => {
    try {
      const readingsAfter = JSON.stringify({
        temperature: values.temperature_after,
        turbidity: values.turbidity_after,
        ph: values.ph_after
      });
      await preventiveMaintenanceApi.completeExecution(selectedExecution.id, {
        readingsAfter,
        abnormalityFound: values.abnormalityFound || false,
        abnormalityDescription: values.abnormalityDescription || '',
        notes: values.notes || ''
      });
      message.success('维护执行完成');
      setReadingsModalOpen(false);
      setSelectedExecution(null);
      readingsForm.resetFields();
      loadData();
    } catch (err) {
      message.error('完成失败');
    }
  };

  const handleDeepMaintenance = async (values) => {
    try {
      await preventiveMaintenanceApi.deepMaintenance(selectedHealthPool.pool_id, {
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        notes: values.notes || ''
      });
      message.success('深度保养记录已保存，健康评分已更新');
      setDeepMaintenanceModalOpen(false);
      setSelectedHealthPool(null);
      deepMaintenanceForm.resetFields();
      loadData();
    } catch (err) {
      message.error('操作失败');
    }
  };

  const handleMarkReminderRead = async (id) => {
    try {
      await preventiveMaintenanceApi.markReminderRead(id);
      loadData();
    } catch (err) {
      message.error('操作失败');
    }
  };

  const handleGenerateReminders = async () => {
    try {
      const res = await preventiveMaintenanceApi.generateReminders();
      message.success(res.data.message);
      loadData();
    } catch (err) {
      message.error('生成提醒失败');
    }
  };

  const openEditPlanModal = (plan) => {
    setSelectedPlan(plan);
    editPlanForm.setFieldsValue({
      planName: plan.plan_name,
      maintenanceType: plan.maintenance_type,
      scheduleWeekday: plan.schedule_weekday,
      scheduleTime: plan.schedule_time,
      description: plan.description,
      estimatedDurationMinutes: plan.estimated_duration_minutes,
      assigneeIds: plan.assignee_ids ? plan.assignee_ids.split(',').filter(Boolean) : []
    });
    setEditPlanModalOpen(true);
  };

  const openExecuteModal = (plan) => {
    const scheduledTime = new Date();
    const currentDay = scheduledTime.getDay();
    let daysAhead = plan.schedule_weekday - currentDay;
    if (daysAhead <= 0) daysAhead += 7;
    scheduledTime.setDate(scheduledTime.getDate() + daysAhead);
    const [h, m] = plan.schedule_time.split(':').map(Number);
    scheduledTime.setHours(h, m, 0, 0);

    setSelectedExecution({
      id: null,
      plan_id: plan.id,
      pool_id: plan.pool_id,
      maintenance_type: plan.maintenance_type,
      scheduledTime: scheduledTime.toISOString()
    });
    executeForm.resetFields();
    setExecuteModalOpen(true);
  };

  const openReadingsModal = (execution) => {
    setSelectedExecution(execution);
    readingsForm.resetFields();
    setReadingsModalOpen(true);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  const getScoreStatus = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'normal';
    return 'exception';
  };

  const planColumns = [
    {
      title: '计划名称',
      dataIndex: 'plan_name',
      key: 'plan_name',
      width: 160
    },
    {
      title: '关联汤池',
      dataIndex: 'pool_id',
      key: 'pool_id',
      render: (id) => poolMap[id] || id
    },
    {
      title: '维护类型',
      dataIndex: 'maintenance_type',
      key: 'maintenance_type',
      render: (t) => <Tag color={MAINTENANCE_TYPE_MAP[t]?.color}>{MAINTENANCE_TYPE_MAP[t]?.text || t}</Tag>
    },
    {
      title: '计划时间',
      key: 'schedule',
      render: (_, r) => `${WEEKDAYS[r.schedule_weekday]} ${r.schedule_time}`
    },
    {
      title: '预计时长',
      dataIndex: 'estimated_duration_minutes',
      key: 'estimated_duration_minutes',
      render: (m) => `${m}分钟`
    },
    {
      title: '执行人',
      dataIndex: 'assignee_names',
      key: 'assignee_names',
      render: (names) => names || '未指定'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={s === 'active' ? 'green' : 'default'}>{s === 'active' ? '启用' : '停用'}</Tag>
    },
    {
      title: '创建人',
      dataIndex: 'creator_name',
      key: 'creator_name'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === 'active' && (
            <Button size="small" type="primary" onClick={() => openExecuteModal(record)}>
              执行
            </Button>
          )}
          <Button size="small" onClick={() => openEditPlanModal(record)}>编辑</Button>
          {record.status === 'active' && (
            <Popconfirm title="确定停用此计划？" onConfirm={() => handleDeletePlan(record.id)}>
              <Button size="small" danger>停用</Button>
            </Popconfirm>
          )}
        </Space>
      ),
      width: 200
    }
  ];

  const executionColumns = [
    {
      title: '计划时间',
      dataIndex: 'scheduled_time',
      key: 'scheduled_time',
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
      width: 160
    },
    {
      title: '汤池',
      dataIndex: 'pool_id',
      key: 'pool_id',
      render: (id) => poolMap[id] || id
    },
    {
      title: '维护类型',
      dataIndex: 'maintenance_type',
      key: 'maintenance_type',
      render: (t) => <Tag color={MAINTENANCE_TYPE_MAP[t]?.color}>{MAINTENANCE_TYPE_MAP[t]?.text || t}</Tag>
    },
    {
      title: '实际开始',
      dataIndex: 'actual_start_time',
      key: 'actual_start_time',
      render: (t) => t ? dayjs(t).format('HH:mm') : '-'
    },
    {
      title: '实际结束',
      dataIndex: 'actual_end_time',
      key: 'actual_end_time',
      render: (t) => t ? dayjs(t).format('HH:mm') : '-'
    },
    {
      title: '实际时长',
      dataIndex: 'actual_duration_minutes',
      key: 'actual_duration_minutes',
      render: (m) => m ? `${m}分钟` : '-'
    },
    {
      title: '异常',
      dataIndex: 'abnormality_found',
      key: 'abnormality_found',
      render: (v) => v ? <Tag color="red">有异常</Tag> : <Tag color="green">正常</Tag>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={EXECUTION_STATUS_MAP[s]?.color}>{EXECUTION_STATUS_MAP[s]?.text}</Tag>
    },
    {
      title: '操作人',
      dataIndex: 'operator_name',
      key: 'operator_name'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        if (record.status === 'pending') {
          return (
            <Button size="small" type="primary" onClick={() => openReadingsModal(record)}>
              开始执行
            </Button>
          );
        }
        if (record.status === 'in_progress') {
          return (
            <Button size="small" type="primary" onClick={() => openReadingsModal(record)}>
              填写完成
            </Button>
          );
        }
        if (record.abnormality_found) {
          return (
            <Tooltip title={record.abnormality_description}>
              <Tag color="red" icon={<ExclamationCircleOutlined />}>查看异常</Tag>
            </Tooltip>
          );
        }
        return <Tag color="green" icon={<CheckCircleOutlined />}>已完成</Tag>;
      },
      width: 120
    }
  ];

  const reminderColumns = [
    {
      title: '提醒时间',
      dataIndex: 'reminder_time',
      key: 'reminder_time',
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
      width: 160
    },
    {
      title: '汤池',
      dataIndex: 'pool_id',
      key: 'pool_id',
      render: (id) => poolMap[id] || id
    },
    {
      title: '维护类型',
      dataIndex: 'maintenance_type',
      key: 'maintenance_type',
      render: (t) => <Tag color={MAINTENANCE_TYPE_MAP[t]?.color || 'default'}>{MAINTENANCE_TYPE_MAP[t]?.text || t}</Tag>
    },
    {
      title: '计划执行时间',
      dataIndex: 'scheduled_time',
      key: 'scheduled_time',
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '消息内容',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s, r) => (
        <Tag color={s === 'pending' ? 'orange' : s === 'sent' ? 'blue' : 'green'}>
          {s === 'pending' ? '待发送' : s === 'sent' ? '已发送' : '已读'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        record.is_read ? null : (
          <Button size="small" onClick={() => handleMarkReminderRead(record.id)}>
            标记已读
          </Button>
        )
      ),
      width: 100
    }
  ];

  const healthColumns = [
    {
      title: '汤池',
      dataIndex: 'pool_name',
      key: 'pool_name',
      render: (name, record) => name || record.pool_id
    },
    {
      title: '区域',
      dataIndex: 'zone',
      key: 'zone'
    },
    {
      title: '健康评分',
      dataIndex: 'health_score',
      key: 'health_score',
      sorter: (a, b) => a.health_score - b.health_score,
      render: (score) => (
        <Progress
          type="circle"
          percent={score}
          size={50}
          strokeColor={getScoreColor(score)}
          format={(p) => `${p}`}
          status={getScoreStatus(score)}
        />
      ),
      width: 100
    },
    {
      title: '累计运行(h)',
      dataIndex: 'total_running_hours',
      key: 'total_running_hours',
      render: (h) => Math.round(h)
    },
    {
      title: '维修次数',
      dataIndex: 'repair_count',
      key: 'repair_count'
    },
    {
      title: '水质达标率',
      dataIndex: 'water_quality_pass_rate',
      key: 'water_quality_pass_rate',
      render: (r) => (
        <Progress
          percent={Math.round(r)}
          size="small"
          strokeColor={r >= 90 ? '#52c41a' : r >= 70 ? '#faad14' : '#ff4d4f'}
        />
      )
    },
    {
      title: '上次深度保养',
      dataIndex: 'last_deep_maintenance',
      key: 'last_deep_maintenance',
      render: (t) => t ? dayjs(t).format('YYYY-MM-DD') : '从未'
    },
    {
      title: '风险提示',
      key: 'risk',
      render: (_, record) => {
        if (record.health_score < 60) {
          return <Tag color="red" icon={<AlertOutlined />}>需紧急深度保养</Tag>;
        }
        if (record.health_score < 80) {
          return <Tag color="orange" icon={<ExclamationCircleOutlined />}>建议安排深度保养</Tag>;
        }
        return <Tag color="green" icon={<CheckCircleOutlined />}>状态良好</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          icon={<ToolOutlined />}
          onClick={() => {
            setSelectedHealthPool(record);
            deepMaintenanceForm.resetFields();
            setDeepMaintenanceModalOpen(true);
          }}
        >
          深度保养
        </Button>
      ),
      width: 120
    }
  ];

  const renderReadingsForm = () => {
    const exec = selectedExecution;
    if (!exec) return null;

    let beforeReadings = {};
    if (exec.readings_before) {
      try { beforeReadings = JSON.parse(exec.readings_before); } catch (e) {}
    }

    if (exec.status === 'pending') {
      return (
        <>
          <Title level={5}>维护前读数记录</Title>
          <Form.Item name="temperature_before" label="维护前水温(℃)" rules={[{ required: true, message: '请输入' }]}>
            <InputNumber min={0} max={60} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="turbidity_before" label="维护前浊度(NTU)" rules={[{ required: true, message: '请输入' }]}>
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="ph_before" label="维护前pH值" rules={[{ required: true, message: '请输入' }]}>
            <InputNumber min={0} max={14} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
        </>
      );
    }

    if (exec.status === 'in_progress') {
      return (
        <>
          <Descriptions column={3} size="small" bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="维护前水温">{beforeReadings.temperature || '-'}℃</Descriptions.Item>
            <Descriptions.Item label="维护前浊度">{beforeReadings.turbidity || '-'} NTU</Descriptions.Item>
            <Descriptions.Item label="维护前pH">{beforeReadings.ph || '-'}</Descriptions.Item>
          </Descriptions>
          <Title level={5}>维护后读数记录</Title>
          <Form.Item name="temperature_after" label="维护后水温(℃)" rules={[{ required: true, message: '请输入' }]}>
            <InputNumber min={0} max={60} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="turbidity_after" label="维护后浊度(NTU)" rules={[{ required: true, message: '请输入' }]}>
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="ph_after" label="维护后pH值" rules={[{ required: true, message: '请输入' }]}>
            <InputNumber min={0} max={14} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="abnormalityFound" label="是否发现异常" valuePropName="checked">
            <Select options={[
              { label: '无异常', value: false },
              { label: '发现异常', value: true }
            ]} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.abnormalityFound !== cur.abnormalityFound}>
            {({ getFieldValue }) => getFieldValue('abnormalityFound') ? (
              <Form.Item name="abnormalityDescription" label="异常描述" rules={[{ required: true, message: '请描述异常情况' }]}>
                <Input.TextArea rows={3} placeholder="发现异常将自动触发闭池流程并关联工单" />
              </Form.Item>
            ) : null}
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </>
      );
    }

    return null;
  };

  const unreadReminders = reminders.filter(r => !r.is_read).length;

  const tabItems = [
    {
      key: 'plans',
      label: (
        <span>
          <ScheduleOutlined /> 维护计划
        </span>
      ),
      children: (
        <Card loading={loading}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>每周维护计划</Title>
            <Space>
              <Button icon={<BellOutlined />} onClick={handleGenerateReminders}>生成提醒</Button>
              {(currentUser?.role === 'water_quality' || currentUser?.role === 'engineering' || currentUser?.role === 'admin') && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { planForm.resetFields(); setPlanModalOpen(true); }}>
                  新建计划
                </Button>
              )}
            </Space>
          </div>
          <Table dataSource={plans} columns={planColumns} rowKey="id" pagination={{ pageSize: 10 }} />
        </Card>
      )
    },
    {
      key: 'executions',
      label: (
        <span>
          <PlayCircleOutlined /> 执行记录
        </span>
      ),
      children: (
        <Card loading={loading}>
          <Title level={4} style={{ marginBottom: 16 }}>维护执行记录</Title>
          <Table dataSource={executions} columns={executionColumns} rowKey="id" pagination={{ pageSize: 10 }} />
        </Card>
      )
    },
    {
      key: 'reminders',
      label: (
        <span>
          <Badge count={unreadReminders} size="small" offset={[6, -2]}>
            <BellOutlined /> 提醒
          </Badge>
        </span>
      ),
      children: (
        <Card loading={loading}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>维护提醒</Title>
            <Button icon={<BellOutlined />} onClick={handleGenerateReminders}>刷新提醒</Button>
          </div>
          <Table dataSource={reminders} columns={reminderColumns} rowKey="id" pagination={{ pageSize: 10 }} />
        </Card>
      )
    },
    {
      key: 'health',
      label: (
        <span>
          <HeartOutlined /> 健康档案
        </span>
      ),
      children: (
        <Card loading={loading}>
          <Title level={4} style={{ marginBottom: 16 }}>汤池健康档案</Title>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {healthProfiles.filter(p => p.health_score < 60).map(p => (
              <Col xs={24} sm={12} md={8} key={p.pool_id}>
                <Card size="small" style={{ borderColor: '#ff4d4f', borderWidth: 2 }}>
                  <Space>
                    <AlertOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
                    <div>
                      <Text strong>{p.pool_name || p.pool_id}</Text>
                      <br />
                      <Text type="danger">健康评分 {p.health_score}，需紧急安排深度保养</Text>
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
          <Table dataSource={healthProfiles} columns={healthColumns} rowKey="id" pagination={{ pageSize: 10 }} />
        </Card>
      )
    }
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>预防性维护计划</Title>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <Modal
        title="新建维护计划"
        open={planModalOpen}
        onCancel={() => setPlanModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={planForm} onFinish={handleCreatePlan} layout="vertical">
          <Form.Item name="poolId" label="关联汤池" rules={[{ required: true, message: '请选择汤池' }]}>
            <Select
              placeholder="选择汤池"
              showSearch
              optionFilterProp="label"
              options={pools.map(p => ({ label: `${p.name} (${p.zone})`, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="planName" label="计划名称" rules={[{ required: true, message: '请输入计划名称' }]}>
            <Input placeholder="例如：贵妃汤每周例行消毒" />
          </Form.Item>
          <Form.Item name="maintenanceType" label="维护类型" rules={[{ required: true, message: '请选择维护类型' }]}>
            <Select options={[
              { label: '例行消毒', value: 'routine_disinfection' },
              { label: '设备检查', value: 'equipment_inspection' },
              { label: '矿物质补充', value: 'mineral_supplement' },
              { label: '管道清洗', value: 'pipe_cleaning' }
            ]} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="scheduleWeekday" label="计划星期" rules={[{ required: true, message: '请选择' }]}>
                <Select options={WEEKDAYS.map((d, i) => ({ label: d, value: i }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="scheduleTime" label="计划时间" rules={[{ required: true, message: '请选择时间' }]}>
                <Input type="time" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="estimatedDurationMinutes" label="预计时长(分钟)" initialValue={60}>
            <InputNumber min={10} max={480} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="assigneeIds" label="指派执行人">
            <Select
              mode="multiple"
              placeholder="选择执行人"
              options={engineers.map(u => ({ label: u.name, value: u.id }))}
            />
          </Form.Item>
          <Form.Item name="description" label="计划说明">
            <Input.TextArea rows={3} placeholder="详细描述维护内容和注意事项" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>创建计划</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑维护计划"
        open={editPlanModalOpen}
        onCancel={() => { setEditPlanModalOpen(false); setSelectedPlan(null); }}
        footer={null}
        width={600}
      >
        <Form form={editPlanForm} onFinish={handleEditPlan} layout="vertical">
          <Form.Item name="planName" label="计划名称" rules={[{ required: true, message: '请输入计划名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="maintenanceType" label="维护类型" rules={[{ required: true, message: '请选择维护类型' }]}>
            <Select options={[
              { label: '例行消毒', value: 'routine_disinfection' },
              { label: '设备检查', value: 'equipment_inspection' },
              { label: '矿物质补充', value: 'mineral_supplement' },
              { label: '管道清洗', value: 'pipe_cleaning' }
            ]} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="scheduleWeekday" label="计划星期" rules={[{ required: true }]}>
                <Select options={WEEKDAYS.map((d, i) => ({ label: d, value: i }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="scheduleTime" label="计划时间" rules={[{ required: true }]}>
                <Input type="time" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="estimatedDurationMinutes" label="预计时长(分钟)">
            <InputNumber min={10} max={480} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="assigneeIds" label="指派执行人">
            <Select
              mode="multiple"
              placeholder="选择执行人"
              options={engineers.map(u => ({ label: u.name, value: u.id }))}
            />
          </Form.Item>
          <Form.Item name="description" label="计划说明">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>保存修改</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="开始执行维护"
        open={executeModalOpen}
        onCancel={() => { setExecuteModalOpen(false); setSelectedExecution(null); }}
        onOk={async () => {
          const exec = selectedExecution;
          try {
            const res = await preventiveMaintenanceApi.createExecution({
              planId: exec.plan_id,
              poolId: exec.pool_id,
              maintenanceType: exec.maintenance_type,
              scheduledTime: exec.scheduledTime,
              operatorId: currentUser.id,
              operatorName: currentUser.name
            });
            const newExec = res.data;
            await preventiveMaintenanceApi.startExecution(newExec.id, {
              readingsBefore: JSON.stringify({
                temperature: executeForm.getFieldValue('temperature_before'),
                turbidity: executeForm.getFieldValue('turbidity_before'),
                ph: executeForm.getFieldValue('ph_before')
              })
            });
            message.success('维护已开始执行');
            setExecuteModalOpen(false);
            setSelectedExecution(null);
            executeForm.resetFields();
            loadData();
          } catch (err) {
            message.error('操作失败');
          }
        }}
        okText="开始执行"
        width={500}
      >
        {selectedExecution && (
          <Form form={executeForm} layout="vertical">
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="汤池">{poolMap[selectedExecution.pool_id]}</Descriptions.Item>
              <Descriptions.Item label="维护类型">
                {MAINTENANCE_TYPE_MAP[selectedExecution.maintenance_type]?.text}
              </Descriptions.Item>
            </Descriptions>
            <Title level={5}>维护前读数</Title>
            <Form.Item name="temperature_before" label="水温(℃)" rules={[{ required: true }]}>
              <InputNumber min={0} max={60} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="turbidity_before" label="浊度(NTU)" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="ph_before" label="pH值" rules={[{ required: true }]}>
              <InputNumber min={0} max={14} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Modal
        title={selectedExecution?.status === 'pending' ? '开始维护 - 记录维护前读数' : '完成维护 - 记录维护后读数'}
        open={readingsModalOpen}
        onCancel={() => { setReadingsModalOpen(false); setSelectedExecution(null); }}
        footer={selectedExecution?.status === 'pending' ? null : undefined}
        onOk={selectedExecution?.status === 'in_progress' ? () => readingsForm.submit() : undefined}
        okText="完成维护"
        width={600}
      >
        {selectedExecution && (
          <>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="汤池">{poolMap[selectedExecution.pool_id]}</Descriptions.Item>
              <Descriptions.Item label="维护类型">
                {MAINTENANCE_TYPE_MAP[selectedExecution.maintenance_type]?.text}
              </Descriptions.Item>
              <Descriptions.Item label="计划时间">
                {dayjs(selectedExecution.scheduled_time).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="操作人">{selectedExecution.operator_name}</Descriptions.Item>
            </Descriptions>
            <Form form={readingsForm} onFinish={handleCompleteExecution} layout="vertical">
              {renderReadingsForm()}
            </Form>
          </>
        )}
      </Modal>

      <Modal
        title={`深度保养 - ${selectedHealthPool?.pool_name || ''}`}
        open={deepMaintenanceModalOpen}
        onCancel={() => { setDeepMaintenanceModalOpen(false); setSelectedHealthPool(null); }}
        footer={null}
      >
        {selectedHealthPool && (
          <>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="当前评分">
                <span style={{ color: getScoreColor(selectedHealthPool.health_score), fontWeight: 'bold' }}>
                  {selectedHealthPool.health_score}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="累计运行">{Math.round(selectedHealthPool.total_running_hours)}h</Descriptions.Item>
              <Descriptions.Item label="维修次数">{selectedHealthPool.repair_count}</Descriptions.Item>
              <Descriptions.Item label="水质达标率">{Math.round(selectedHealthPool.water_quality_pass_rate)}%</Descriptions.Item>
            </Descriptions>
            <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
              <Text type="success">深度保养后，健康评分将恢复 +15 分（最高100分）</Text>
            </div>
            <Form form={deepMaintenanceForm} onFinish={handleDeepMaintenance} layout="vertical">
              <Form.Item name="notes" label="保养说明">
                <Input.TextArea rows={4} placeholder="请记录深度保养内容、更换部件等信息" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>确认完成深度保养</Button>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}
