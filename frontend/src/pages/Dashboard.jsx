import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Alert, Badge, Button } from 'antd';
import {
  FundOutlined,
  WarningOutlined,
  ToolOutlined,
  MoneyCollectOutlined,
  EyeOutlined,
  FireOutlined,
  CloseCircleOutlined,
  WarningFilled,
  ScheduleOutlined,
  HeartOutlined,
  BellOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { statsApi, poolsApi, complaintsApi, maintenanceApi, preventiveMaintenanceApi } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;

const statusColors = {
  open: 'green',
  closed: 'red',
  maintenance: 'orange'
};

const statusText = {
  open: '开放',
  closed: '关闭',
  maintenance: '维护中'
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [pools, setPools] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [pmAlerts, setPmAlerts] = useState(null);

  const loadData = async () => {
    try {
      const [statsRes, poolsRes, complaintsRes, maintenanceRes, alertsRes] = await Promise.all([
        statsApi.overview(),
        poolsApi.list(),
        complaintsApi.list({ status: 'pending' }),
        maintenanceApi.list({ status: 'pending' }),
        preventiveMaintenanceApi.getDashboardAlerts({ role: currentUser?.role }).catch(() => ({ data: { reminders: [], lowScoreProfiles: [], pendingExecutions: [] } }))
      ]);
      setStats(statsRes.data);
      setPools(poolsRes.data);
      setComplaints(complaintsRes.data);
      setMaintenance(maintenanceRes.data);
      setPmAlerts(alertsRes.data);
    } catch (err) {
      console.error('加载数据失败', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const poolColumns = [
    { title: '汤池名称', dataIndex: 'name', key: 'name' },
    { title: '区域', dataIndex: 'zone', key: 'zone' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={statusColors[s]}>{statusText[s]}</Tag>
    },
    { title: '水温(℃)', dataIndex: 'temperature', key: 'temperature' },
    { title: '容量', dataIndex: 'capacity', key: 'capacity' }
  ];

  const complaintColumns = [
    { title: '投诉类型', dataIndex: 'complaint_type', key: 'complaint_type' },
    { title: '区域/汤池', dataIndex: 'zone', key: 'zone' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t) => dayjs(t).format('MM-DD HH:mm')
    }
  ];

  const maintenanceColumns = [
    { title: '设备类型', dataIndex: 'equipment_type', key: 'equipment_type' },
    { title: '问题描述', dataIndex: 'issue_description', key: 'issue_description', ellipsis: true },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (p) => (
        <Tag color={p === 'high' ? 'red' : p === 'normal' ? 'blue' : 'default'}>
          {p === 'high' ? '高' : p === 'normal' ? '普通' : '低'}
        </Tag>
      )
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t) => dayjs(t).format('MM-DD HH:mm')
    }
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>工作台</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="汤池总数"
              value={stats?.pools?.total || 0}
              prefix={<FundOutlined style={{ color: '#13c2c2' }} />}
              suffix={`/ 开放 ${stats?.pools?.open_count || 0}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="今日投诉"
              value={stats?.todayComplaints || 0}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="待处理维修"
              value={stats?.pendingMaintenance || 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="待处理赔付"
              value={stats?.pendingCompensations || 0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<MoneyCollectOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={4}>
          <Card className="stat-card">
            <Statistic
              title="开放汤池"
              value={stats?.pools?.open_count || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<FireOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card className="stat-card">
            <Statistic
              title="关闭汤池"
              value={stats?.pools?.closed_count || 0}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card className="stat-card">
            <Statistic
              title="维护中汤池"
              value={stats?.pools?.maintenance_count || 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningFilled />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card className="stat-card">
            <Statistic
              title="待处理投诉"
              value={stats?.pendingComplaints || 0}
              valueStyle={{ color: '#eb2f96' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card className="stat-card">
            <Statistic
              title="今日巡场"
              value={stats?.todayPatrols || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card className="stat-card">
            <Statistic
              title="待赔付"
              value={stats?.pendingCompensations || 0}
              valueStyle={{ color: '#13c2c2' }}
              prefix={<MoneyCollectOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card className="stat-card">
            <Statistic
              title="维护提醒"
              value={pmAlerts?.reminders?.length || 0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<BellOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card className="stat-card">
            <Statistic
              title="健康预警"
              value={pmAlerts?.lowScoreProfiles?.length || 0}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<HeartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {pmAlerts?.lowScoreProfiles?.length > 0 && (
        <Alert
          message="汤池健康预警"
          description={
            pmAlerts.lowScoreProfiles.map(p =>
              `${p.pool_name || p.pool_id}（评分：${p.health_score}）`
            ).join('、') + '，健康评分低于阈值，请尽快安排深度保养！'
          }
          type="warning"
          showIcon
          icon={<HeartOutlined />}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" onClick={() => navigate('/preventive-maintenance')}>
              查看详情
            </Button>
          }
        />
      )}

      {pmAlerts?.reminders?.filter(r => !r.is_read)?.length > 0 && (
        <Card
          title={
            <span>
              <BellOutlined style={{ marginRight: 8 }} />
              预防性维护提醒
              <Badge count={pmAlerts.reminders.filter(r => !r.is_read).length} style={{ marginLeft: 8 }} />
            </span>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          {pmAlerts.reminders.filter(r => !r.is_read).slice(0, 3).map(r => (
            <div key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <Tag color={r.maintenance_type === 'abnormal_closure' ? 'red' : 'blue'}>
                {r.maintenance_type === 'abnormal_closure' ? '紧急' : '维护'}
              </Tag>
              <span>{r.message}</span>
              <span style={{ color: '#999', marginLeft: 8 }}>{dayjs(r.scheduled_time).format('MM-DD HH:mm')}</span>
            </div>
          ))}
        </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="汤池状态总览" size="small">
            <Table
              dataSource={pools}
              columns={poolColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 5 }}
              onRow={(record) => ({
                onClick: () => navigate(`/pools/${record.id}`),
                style: { cursor: 'pointer' }
              })}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="待处理投诉" size="small">
            <Table
              dataSource={complaints}
              columns={complaintColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 5 }}
              locale={{ emptyText: '暂无待处理投诉' }}
              onRow={(record) => ({
                onClick: () => navigate('/complaints'),
                style: { cursor: 'pointer' }
              })}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="待处理维修" size="small">
            <Table
              dataSource={maintenance}
              columns={maintenanceColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 5 }}
              locale={{ emptyText: '暂无待处理维修' }}
              onRow={(record) => ({
                onClick: () => navigate('/maintenance'),
                style: { cursor: 'pointer' }
              })}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
