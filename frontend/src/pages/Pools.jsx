import { useState, useEffect } from 'react';
import { Row, Col, Card, Tag, Button, Select, Space, Modal, Form, Input, InputNumber, Typography, message } from 'antd';
import { PlusOutlined, FireOutlined, CloseCircleOutlined, WarningFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { poolsApi } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;

const statusConfig = {
  open: { color: 'green', text: '开放', icon: <FireOutlined /> },
  closed: { color: 'red', text: '关闭', icon: <CloseCircleOutlined /> },
  maintenance: { color: 'orange', text: '维护中', icon: <WarningFilled /> }
};

export default function Pools() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [zoneFilter, setZoneFilter] = useState();
  const [statusFilter, setStatusFilter] = useState();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);
  const [form] = Form.useForm();
  const [statusForm] = Form.useForm();

  const zones = [...new Set(pools.map(p => p.zone))];

  const loadPools = async () => {
    setLoading(true);
    try {
      const params = {};
      if (zoneFilter) params.zone = zoneFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await poolsApi.list(params);
      setPools(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPools();
  }, [zoneFilter, statusFilter]);

  const handleAddPool = async (values) => {
    try {
      await poolsApi.create(values);
      message.success('汤池添加成功');
      setAddModalOpen(false);
      form.resetFields();
      loadPools();
    } catch (err) {
      message.error('添加失败');
    }
  };

  const handleUpdateStatus = async (values) => {
    try {
      await poolsApi.updateStatus(selectedPool.id, {
        ...values,
        operatorId: currentUser.id,
        operatorName: currentUser.name
      });
      message.success('状态更新成功');
      setStatusModalOpen(false);
      statusForm.resetFields();
      setSelectedPool(null);
      loadPools();
    } catch (err) {
      message.error('更新失败');
    }
  };

  const openStatusModal = (pool) => {
    setSelectedPool(pool);
    statusForm.setFieldsValue({ status: pool.status, temperature: pool.temperature });
    setStatusModalOpen(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>汤池管理</Title>
        <Space>
          <Select
            placeholder="按区域筛选"
            style={{ width: 150 }}
            allowClear
            value={zoneFilter}
            onChange={setZoneFilter}
            options={zones.map(z => ({ label: z, value: z }))}
          />
          <Select
            placeholder="按状态筛选"
            style={{ width: 120 }}
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: '开放', value: 'open' },
              { label: '关闭', value: 'closed' },
              { label: '维护中', value: 'maintenance' }
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
            添加汤池
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {pools.map(pool => {
          const cfg = statusConfig[pool.status] || statusConfig.open;
          return (
            <Col xs={24} sm={12} md={8} lg={6} key={pool.id}>
              <Card
                className={`pool-card pool-status-${pool.status}`}
                onClick={() => navigate(`/pools/${pool.id}`)}
                title={
                  <Space>
                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                    <span>{pool.name}</span>
                    <Tag color={cfg.color}>{cfg.text}</Tag>
                  </Space>
                }
                extra={
                  <Button
                    size="small"
                    onClick={(e) => { e.stopPropagation(); openStatusModal(pool); }}
                  >
                    改状态
                  </Button>
                }
                size="small"
              >
                <div style={{ fontSize: 13, color: '#666' }}>
                  <div>区域：{pool.zone}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <FireOutlined style={{ color: '#ff4d4f' }} />
                    水温：{pool.status === 'open' ? `${pool.temperature}℃` : '--'}
                  </div>
                  <div style={{ marginTop: 4 }}>容量：{pool.capacity}人</div>
                  {pool.minerals && <div style={{ marginTop: 4 }}>矿物质：{pool.minerals}</div>}
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Modal
        title="添加汤池"
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleAddPool} layout="vertical">
          <Form.Item name="name" label="汤池名称" rules={[{ required: true }]}>
            <Input placeholder="请输入汤池名称" />
          </Form.Item>
          <Form.Item name="zone" label="所属区域" rules={[{ required: true }]}>
            <Input placeholder="如：A区-唐风区" />
          </Form.Item>
          <Form.Item name="temperature" label="初始水温(℃)">
            <InputNumber min={0} max={60} defaultValue={40} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="capacity" label="容量(人)">
            <InputNumber min={1} defaultValue={20} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="minerals" label="矿物质">
            <Input placeholder="如：硫磺、玫瑰等" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认添加</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`更新汤池状态 - ${selectedPool?.name}`}
        open={statusModalOpen}
        onCancel={() => { setStatusModalOpen(false); setSelectedPool(null); }}
        footer={null}
      >
        <Form form={statusForm} onFinish={handleUpdateStatus} layout="vertical">
          <Form.Item name="status" label="汤池状态" rules={[{ required: true }]}>
            <Select options={[
              { label: '开放', value: 'open' },
              { label: '关闭', value: 'closed' },
              { label: '维护中', value: 'maintenance' }
            ]} />
          </Form.Item>
          <Form.Item name="temperature" label="当前水温(℃)">
            <InputNumber min={0} max={60} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认更新</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
