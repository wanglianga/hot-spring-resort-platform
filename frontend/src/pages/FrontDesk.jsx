import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space, Typography, Tag, DatePicker, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { frontdeskApi, poolsApi } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;

const serviceTypeMap = {
  ticket_entry: { color: 'blue', text: '套票入园' },
  private_pool: { color: 'purple', text: '包池服务' },
  pool_change: { color: 'cyan', text: '换池服务' }
};

export default function FrontDesk() {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState([]);
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [serviceType, setServiceType] = useState(null);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsRes, poolsRes] = await Promise.all([
        frontdeskApi.list(),
        poolsApi.list()
      ]);
      setRecords(recordsRes.data);
      setPools(poolsRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        startTime: values.startTime?.toISOString(),
        endTime: values.endTime?.toISOString(),
        operatorId: currentUser.id,
        operatorName: currentUser.name
      };
      await frontdeskApi.create(payload);
      message.success('服务记录添加成功');
      setModalOpen(false);
      setServiceType(null);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error('添加失败');
    }
  };

  const poolMap = Object.fromEntries(pools.map(p => [p.id, p.name]));
  const openPools = pools.filter(p => p.status === 'open');

  const columns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
      width: 160
    },
    {
      title: '服务类型',
      dataIndex: 'service_type',
      key: 'service_type',
      render: (s) => <Tag color={serviceTypeMap[s]?.color}>{serviceTypeMap[s]?.text || s}</Tag>
    },
    { title: '客户姓名', dataIndex: 'customer_name', key: 'customer_name' },
    { title: '联系电话', dataIndex: 'customer_phone', key: 'customer_phone' },
    { title: '票种/套餐', dataIndex: 'ticket_type', key: 'ticket_type' },
    {
      title: '汤池',
      dataIndex: 'pool_id',
      key: 'pool_id',
      render: (id) => id ? poolMap[id] : '-'
    },
    {
      title: '换池',
      key: 'change',
      render: (_, r) => r.from_pool_id ? `${poolMap[r.from_pool_id]} → ${poolMap[r.to_pool_id]}` : '-',
    },
    { title: '人数', dataIndex: 'people_count', key: 'people_count' },
    { title: '经办人', dataIndex: 'operator_name', key: 'operator_name', width: 100 }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>前厅服务管理</Title>
        <Space>
          <Button onClick={() => { setServiceType('ticket_entry'); setModalOpen(true); }}>
            套票入园
          </Button>
          <Button onClick={() => { setServiceType('private_pool'); setModalOpen(true); }}>
            包池服务
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setServiceType('pool_change'); setModalOpen(true); }}>
            换池服务
          </Button>
        </Space>
      </div>

      <Card loading={loading}>
        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={serviceTypeMap[serviceType]?.text || '前厅服务'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setServiceType(null); }}
        footer={null}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="serviceType" initialValue={serviceType} hidden>
            <Input />
          </Form.Item>

          {serviceType === 'ticket_entry' && (
            <>
              <Form.Item name="customerName" label="客户姓名">
                <Input placeholder="请输入客户姓名" />
              </Form.Item>
              <Form.Item name="customerPhone" label="联系电话">
                <Input placeholder="请输入联系电话" />
              </Form.Item>
              <Form.Item name="ticketType" label="票种类型" rules={[{ required: true, message: '请选择票种' }]}>
                <Select options={[
                  { label: '成人票', value: '成人票' },
                  { label: '儿童票', value: '儿童票' },
                  { label: '老人票', value: '老人票' },
                  { label: '双人套票', value: '双人套票' },
                  { label: '家庭套票', value: '家庭套票' },
                  { label: 'VIP套票', value: 'VIP套票' }
                ]} />
              </Form.Item>
              <Form.Item name="peopleCount" label="入园人数">
                <InputNumber min={1} defaultValue={1} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}

          {serviceType === 'private_pool' && (
            <>
              <Form.Item name="customerName" label="客户姓名" rules={[{ required: true }]}>
                <Input placeholder="请输入客户姓名" />
              </Form.Item>
              <Form.Item name="customerPhone" label="联系电话" rules={[{ required: true }]}>
                <Input placeholder="请输入联系电话" />
              </Form.Item>
              <Form.Item name="poolId" label="选择汤池" rules={[{ required: true, message: '请选择汤池' }]}>
                <Select
                  placeholder="请选择包池汤池"
                  options={openPools.map(p => ({ label: `${p.name} (容量${p.capacity}人)`, value: p.id }))}
                />
              </Form.Item>
              <Form.Item name="startTime" label="开始时间" rules={[{ required: true }]}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="endTime" label="结束时间" rules={[{ required: true }]}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="peopleCount" label="使用人数">
                <InputNumber min={1} defaultValue={1} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}

          {serviceType === 'pool_change' && (
            <>
              <Form.Item name="customerName" label="客户姓名">
                <Input placeholder="请输入客户姓名" />
              </Form.Item>
              <Form.Item name="fromPoolId" label="原汤池" rules={[{ required: true, message: '请选择原汤池' }]}>
                <Select
                  placeholder="请选择当前汤池"
                  options={openPools.map(p => ({ label: p.name, value: p.id }))}
                />
              </Form.Item>
              <Form.Item name="toPoolId" label="目标汤池" rules={[{ required: true, message: '请选择目标汤池' }]}>
                <Select
                  placeholder="请选择要更换的汤池"
                  options={openPools.map(p => ({ label: p.name, value: p.id }))}
                />
              </Form.Item>
              <Form.Item name="peopleCount" label="人数">
                <InputNumber min={1} defaultValue={1} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}

          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认提交</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
