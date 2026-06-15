import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space, Typography, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { waterQualityApi, poolsApi } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;

export default function WaterQuality() {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState([]);
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsRes, poolsRes] = await Promise.all([
        waterQualityApi.list(),
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
      await waterQualityApi.create({
        ...values,
        operatorId: currentUser.id,
        operatorName: currentUser.name
      });
      message.success('水质检测记录添加成功');
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error('添加失败');
    }
  };

  const poolMap = Object.fromEntries(pools.map(p => [p.id, p.name]));

  const columns = [
    {
      title: '检测时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
      width: 160
    },
    {
      title: '汤池',
      dataIndex: 'pool_id',
      key: 'pool_id',
      render: (id) => poolMap[id] || id
    },
    { title: '水温(℃)', dataIndex: 'temperature', key: 'temperature' },
    { title: '浊度(NTU)', dataIndex: 'turbidity', key: 'turbidity' },
    { title: 'pH值', dataIndex: 'ph', key: 'ph' },
    { title: '消毒方式', dataIndex: 'disinfection_type', key: 'disinfection_type' },
    { title: '消毒剂量', dataIndex: 'disinfection_amount', key: 'disinfection_amount' },
    { title: '检测人', dataIndex: 'operator_name', key: 'operator_name', width: 100 },
    { title: '备注', dataIndex: 'notes', key: 'notes' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>水质检测管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          记录水质检测
        </Button>
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
        title="记录水质检测"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="poolId" label="选择汤池" rules={[{ required: true, message: '请选择汤池' }]}>
            <Select
              placeholder="请选择汤池"
              options={pools.filter(p => p.status === 'open').map(p => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="temperature" label="水温(℃)" rules={[{ required: true, message: '请输入水温' }]}>
            <InputNumber min={0} max={60} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="turbidity" label="浊度(NTU)" rules={[{ required: true, message: '请输入浊度' }]}>
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
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认提交</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
