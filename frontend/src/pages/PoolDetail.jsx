import { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Tabs, Table, Button, Modal, Form, Input, InputNumber, Select, Space, message, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  poolsApi, statsApi, waterQualityApi, mineralsApi,
  disinfectionApi, drainageApi, maintenanceApi, closuresApi, patrolsApi,
  preventiveMaintenanceApi
} from '../api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;

const statusConfig = {
  open: { color: 'green', text: '开放' },
  closed: { color: 'red', text: '关闭' },
  maintenance: { color: 'orange', text: '维护中' }
};

export default function PoolDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [pool, setPool] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [healthProfile, setHealthProfile] = useState(null);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [poolRes, detailRes] = await Promise.all([
        poolsApi.get(id),
        statsApi.poolDetail(id)
      ]);
      setPool(poolRes.data);
      setDetail(detailRes.data);
      try {
        const healthRes = await preventiveMaintenanceApi.getHealthProfile(id);
        setHealthProfile(healthRes.data);
      } catch (e) {
        setHealthProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const openModal = (type) => {
    setModalType(type);
    setModalOpen(true);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      const basePayload = {
        poolId: id,
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        ...values
      };

      switch (modalType) {
        case 'waterQuality':
          await waterQualityApi.create(basePayload);
          break;
        case 'mineral':
          await mineralsApi.create(basePayload);
          break;
        case 'disinfection':
          await disinfectionApi.create(basePayload);
          break;
        case 'drainage':
          await drainageApi.create(basePayload);
          break;
        case 'maintenance':
          await maintenanceApi.create(basePayload);
          break;
        case 'closure':
          await closuresApi.create(basePayload);
          break;
        case 'patrol':
          await patrolsApi.create({ ...basePayload, zone: pool?.zone });
          break;
        default:
          break;
      }
      message.success('记录添加成功');
      setModalOpen(false);
      loadData();
    } catch (err) {
      message.error('添加失败');
    }
  };

  const timeCol = {
    title: '时间',
    dataIndex: 'created_at',
    key: 'created_at',
    render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    width: 160
  };

  const operatorCol = {
    title: '操作人',
    dataIndex: 'operator_name',
    key: 'operator_name',
    width: 100
  };

  const renderModalContent = () => {
    switch (modalType) {
      case 'waterQuality':
        return (
          <>
            <Form.Item name="temperature" label="水温(℃)" rules={[{ required: true }]}>
              <InputNumber min={0} max={60} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="turbidity" label="浊度(NTU)" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="ph" label="pH值">
              <InputNumber min={0} max={14} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="disinfectionType" label="消毒方式">
              <Select options={[
                { label: '氯消毒', value: '氯消毒' },
                { label: '臭氧消毒', value: '臭氧消毒' },
                { label: '紫外线', value: '紫外线' }
              ]} />
            </Form.Item>
            <Form.Item name="disinfectionAmount" label="消毒剂用量">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={2} />
            </Form.Item>
          </>
        );
      case 'mineral':
        return (
          <>
            <Form.Item name="mineralType" label="矿物质类型" rules={[{ required: true }]}>
              <Select options={[
                { label: '硫磺', value: '硫磺' },
                { label: '玫瑰', value: '玫瑰' },
                { label: '茉莉', value: '茉莉' },
                { label: '薰衣草', value: '薰衣草' },
                { label: '牛奶', value: '牛奶' },
                { label: '中草药', value: '中草药' },
                { label: '温泉矿物质', value: '温泉矿物质' }
              ]} />
            </Form.Item>
            <Form.Item name="amount" label="用量" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={2} />
            </Form.Item>
          </>
        );
      case 'disinfection':
        return (
          <>
            <Form.Item name="disinfectantType" label="消毒剂类型" rules={[{ required: true }]}>
              <Select options={[
                { label: '氯片', value: '氯片' },
                { label: '液氯', value: '液氯' },
                { label: '二氧化氯', value: '二氧化氯' },
                { label: '次氯酸钠', value: '次氯酸钠' }
              ]} />
            </Form.Item>
            <Form.Item name="amount" label="用量(kg)" rules={[{ required: true }]}>
              <InputNumber step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={2} />
            </Form.Item>
          </>
        );
      case 'drainage':
        return (
          <>
            <Form.Item name="durationMinutes" label="排污时长(分钟)" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="waterVolume" label="排水量(m³)">
              <InputNumber step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={2} />
            </Form.Item>
          </>
        );
      case 'maintenance':
        return (
          <>
            <Form.Item name="equipmentType" label="设备类型" rules={[{ required: true }]}>
              <Select options={[
                { label: '水泵', value: '水泵' },
                { label: '排污泵', value: '排污泵' },
                { label: '加热设备', value: '加热设备' },
                { label: '循环系统', value: '循环系统' },
                { label: '过滤设备', value: '过滤设备' },
                { label: '其他', value: '其他' }
              ]} />
            </Form.Item>
            <Form.Item name="issueDescription" label="问题描述" rules={[{ required: true }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="priority" label="优先级">
              <Select options={[
                { label: '低', value: 'low' },
                { label: '普通', value: 'normal' },
                { label: '高', value: 'high' }
              ]} />
            </Form.Item>
            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={2} />
            </Form.Item>
          </>
        );
      case 'closure':
        return (
          <>
            <Form.Item name="reason" label="闭池原因" rules={[{ required: true }]}>
              <Select options={[
                { label: '水质不达标', value: '水质不达标' },
                { label: '设备维修', value: '设备维修' },
                { label: '清洁消毒', value: '清洁消毒' },
                { label: '投诉处理', value: '投诉处理' },
                { label: '其他原因', value: '其他原因' }
              ]} />
            </Form.Item>
            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={2} />
            </Form.Item>
          </>
        );
      case 'patrol':
        return (
          <>
            <Form.Item name="visitorDensity" label="游客密度" rules={[{ required: true }]}>
              <Select options={[
                { label: '空闲', value: '空闲' },
                { label: '正常', value: '正常' },
                { label: '较满', value: '较满' },
                { label: '爆满', value: '爆满' }
              ]} />
            </Form.Item>
            <Form.Item name="reminders" label="温馨提示情况">
              <Input.TextArea rows={2} placeholder="如：提醒游客注意防滑、不要长时间浸泡等" />
            </Form.Item>
            <Form.Item name="issuesFound" label="发现的问题">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="notes" label="备注">
              <Input.TextArea rows={2} />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  const modalTitles = {
    waterQuality: '记录水质检测',
    mineral: '记录矿物质补水',
    disinfection: '记录消毒操作',
    drainage: '记录排污操作',
    maintenance: '提交设备维修',
    closure: '申请闭池',
    patrol: '记录巡场'
  };

  if (!pool) return <div>加载中...</div>;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/pools')}>返回列表</Button>
        <Title level={3} style={{ margin: 0 }}>{pool.name}</Title>
        <Tag color={statusConfig[pool.status]?.color}>{statusConfig[pool.status]?.text}</Tag>
      </Space>

      <Card loading={loading} style={{ marginBottom: 16 }}>
        <Descriptions column={4} size="small">
          <Descriptions.Item label="区域">{pool.zone}</Descriptions.Item>
          <Descriptions.Item label="水温">
            {pool.status === 'open' ? `${pool.temperature}℃` : '--'}
          </Descriptions.Item>
          <Descriptions.Item label="容量">{pool.capacity}人</Descriptions.Item>
          <Descriptions.Item label="矿物质">{pool.minerals || '-'}</Descriptions.Item>
          <Descriptions.Item label="描述" span={4}>{pool.description || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        loading={loading}
        title="汤池运营记录"
        tabList={[
          { key: 'waterQuality', label: '水质检测' },
          { key: 'minerals', label: '矿物质补水' },
          { key: 'disinfection', label: '消毒记录' },
          { key: 'drainage', label: '排污记录' },
          { key: 'maintenance', label: '设备维修' },
          { key: 'closures', label: '闭池记录' },
          { key: 'patrols', label: '巡场记录' },
          { key: 'complaints', label: '关联投诉' },
          { key: 'preventiveExec', label: '预防性维护' },
          { key: 'healthProfile', label: '健康档案' }
        ]}
        tabBarExtraContent={
          <Space>
            <Button size="small" onClick={() => openModal('waterQuality')}>记录水质</Button>
            <Button size="small" onClick={() => openModal('mineral')}>矿物质补水</Button>
            <Button size="small" onClick={() => openModal('disinfection')}>消毒</Button>
            <Button size="small" onClick={() => openModal('drainage')}>排污</Button>
            <Button size="small" onClick={() => openModal('maintenance')}>报修</Button>
            <Button size="small" onClick={() => openModal('closure')}>闭池</Button>
            <Button size="small" onClick={() => openModal('patrol')}>巡场记录</Button>
          </Space>
        }
      >
        {(key) => {
          switch (key) {
            case 'waterQuality':
              return (
                <Table size="small" dataSource={detail?.waterQuality || []} rowKey="id"
                  columns={[
                    timeCol,
                    { title: '水温(℃)', dataIndex: 'temperature' },
                    { title: '浊度', dataIndex: 'turbidity' },
                    { title: 'pH值', dataIndex: 'ph' },
                    { title: '消毒方式', dataIndex: 'disinfection_type' },
                    operatorCol,
                    { title: '备注', dataIndex: 'notes' }
                  ]} />
              );
            case 'minerals':
              return (
                <Table size="small" dataSource={detail?.supplements || []} rowKey="id"
                  columns={[
                    timeCol,
                    { title: '矿物质类型', dataIndex: 'mineral_type' },
                    { title: '用量', dataIndex: 'amount' },
                    operatorCol,
                    { title: '备注', dataIndex: 'notes' }
                  ]} />
              );
            case 'disinfection':
              return (
                <Table size="small" dataSource={detail?.disinfection || []} rowKey="id"
                  columns={[
                    timeCol,
                    { title: '消毒剂类型', dataIndex: 'disinfectant_type' },
                    { title: '用量', dataIndex: 'amount' },
                    operatorCol,
                    { title: '备注', dataIndex: 'notes' }
                  ]} />
              );
            case 'drainage':
              return (
                <Table size="small" dataSource={detail?.drainage || []} rowKey="id"
                  columns={[
                    timeCol,
                    { title: '时长(分钟)', dataIndex: 'duration_minutes' },
                    { title: '排水量', dataIndex: 'water_volume' },
                    operatorCol,
                    { title: '备注', dataIndex: 'notes' }
                  ]} />
              );
            case 'maintenance':
              return (
                <Table size="small" dataSource={detail?.maintenance || []} rowKey="id"
                  columns={[
                    timeCol,
                    { title: '设备类型', dataIndex: 'equipment_type' },
                    { title: '问题', dataIndex: 'issue_description', ellipsis: true },
                    { title: '状态', dataIndex: 'status', render: s => (
                      <Tag color={s === 'pending' ? 'orange' : s === 'processing' ? 'blue' : 'green'}>
                        {s === 'pending' ? '待处理' : s === 'processing' ? '处理中' : '已完成'}
                      </Tag>
                    )},
                    { title: '处理人', dataIndex: 'assignee_name' }
                  ]} />
              );
            case 'closures':
              return (
                <Table size="small" dataSource={detail?.closures || []} rowKey="id"
                  columns={[
                    { title: '闭池时间', dataIndex: 'closed_at', render: t => dayjs(t).format('YYYY-MM-DD HH:mm') },
                    { title: '重开时间', dataIndex: 'reopened_at', render: t => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '未开放' },
                    { title: '原因', dataIndex: 'reason' },
                    operatorCol,
                    { title: '备注', dataIndex: 'notes' }
                  ]} />
              );
            case 'patrols':
              return (
                <Table size="small" dataSource={detail?.patrols || []} rowKey="id"
                  columns={[
                    timeCol,
                    { title: '游客密度', dataIndex: 'visitor_density', render: d => (
                      <Tag color={d === '爆满' ? 'red' : d === '较满' ? 'orange' : d === '正常' ? 'blue' : 'green'}>{d}</Tag>
                    )},
                    { title: '提示', dataIndex: 'reminders', ellipsis: true },
                    { title: '问题', dataIndex: 'issues_found', ellipsis: true },
                    operatorCol
                  ]} />
              );
            case 'complaints':
              return (
                <Table size="small" dataSource={detail?.complaints || []} rowKey="id"
                  columns={[
                    timeCol,
                    { title: '类型', dataIndex: 'complaint_type' },
                    { title: '描述', dataIndex: 'description', ellipsis: true },
                    { title: '状态', dataIndex: 'status', render: s => (
                      <Tag color={s === 'pending' ? 'orange' : s === 'processing' ? 'blue' : s === 'resolved' ? 'green' : 'red'}>
                        {s === 'pending' ? '待处理' : s === 'processing' ? '处理中' : s === 'resolved' ? '已解决' : '已关闭'}
                      </Tag>
                    )},
                    { title: '处理人', dataIndex: 'handler_name' }
                  ]} />
              );
            case 'preventiveExec':
              return (
                <Table size="small" dataSource={healthProfile?.executions || []} rowKey="id"
                  columns={[
                    timeCol,
                    { title: '维护类型', dataIndex: 'maintenance_type', render: t => {
                      const map = { routine_disinfection: '例行消毒', equipment_inspection: '设备检查', mineral_supplement: '矿物质补充', pipe_cleaning: '管道清洗' };
                      return <Tag color="blue">{map[t] || t}</Tag>;
                    }},
                    { title: '实际时长', dataIndex: 'actual_duration_minutes', render: m => m ? `${m}分钟` : '-' },
                    { title: '异常', dataIndex: 'abnormality_found', render: v => v ? <Tag color="red">有异常</Tag> : <Tag color="green">正常</Tag> },
                    { title: '状态', dataIndex: 'status', render: s => (
                      <Tag color={s === 'pending' ? 'orange' : s === 'in_progress' ? 'blue' : 'green'}>
                        {s === 'pending' ? '待执行' : s === 'in_progress' ? '执行中' : '已完成'}
                      </Tag>
                    )},
                    operatorCol
                  ]} />
              );
            case 'healthProfile':
              if (!healthProfile) return <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>暂无健康档案数据</div>;
              return (
                <div>
                  <Descriptions column={3} size="small" bordered style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="健康评分">
                      <span style={{ color: healthProfile.health_score >= 80 ? '#52c41a' : healthProfile.health_score >= 60 ? '#faad14' : '#ff4d4f', fontWeight: 'bold', fontSize: 18 }}>
                        {healthProfile.health_score}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="累计运行时长">{Math.round(healthProfile.total_running_hours)} 小时</Descriptions.Item>
                    <Descriptions.Item label="维修次数">{healthProfile.repair_count}</Descriptions.Item>
                    <Descriptions.Item label="水质达标率">{Math.round(healthProfile.water_quality_pass_rate)}%</Descriptions.Item>
                    <Descriptions.Item label="上次深度保养">{healthProfile.last_deep_maintenance ? dayjs(healthProfile.last_deep_maintenance).format('YYYY-MM-DD') : '从未'}</Descriptions.Item>
                    <Descriptions.Item label="风险提示">
                      {healthProfile.health_score < 60 ? <Tag color="red">需紧急深度保养</Tag> :
                       healthProfile.health_score < 80 ? <Tag color="orange">建议安排深度保养</Tag> :
                       <Tag color="green">状态良好</Tag>}
                    </Descriptions.Item>
                  </Descriptions>
                  {healthProfile.health_score < 80 && (
                    <Button type="primary" onClick={() => navigate('/preventive-maintenance')}>
                      前往安排深度保养
                    </Button>
                  )}
                </div>
              );
            default:
              return null;
          }
        }}
      </Card>

      <Modal
        title={modalTitles[modalType]}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          {renderModalContent()}
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认提交</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
