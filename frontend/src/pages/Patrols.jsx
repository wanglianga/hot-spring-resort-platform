import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, Typography, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { patrolsApi, poolsApi } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;

const densityColor = {
  '空闲': 'green',
  '正常': 'blue',
  '较满': 'orange',
  '爆满': 'red'
};

export default function Patrols() {
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
        patrolsApi.list(),
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
      await patrolsApi.create({
        ...values,
        operatorId: currentUser.id,
        operatorName: currentUser.name
      });
      message.success('巡场记录添加成功');
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error('添加失败');
    }
  };

  const poolMap = Object.fromEntries(pools.map(p => [p.id, p.name]));
  const zones = [...new Set(pools.map(p => p.zone))];

  const columns = [
    {
      title: '巡场时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
      width: 160
    },
    { title: '区域', dataIndex: 'zone', key: 'zone' },
    {
      title: '汤池',
      dataIndex: 'pool_id',
      key: 'pool_id',
      render: (id) => id ? poolMap[id] : '-'
    },
    {
      title: '游客密度',
      dataIndex: 'visitor_density',
      key: 'visitor_density',
      render: (d) => <Tag color={densityColor[d]}>{d}</Tag>
    },
    { title: '温馨提示', dataIndex: 'reminders', key: 'reminders', ellipsis: true },
    { title: '发现问题', dataIndex: 'issues_found', key: 'issues_found', ellipsis: true },
    { title: '巡场员', dataIndex: 'operator_name', key: 'operator_name', width: 100 },
    { title: '备注', dataIndex: 'notes', key: 'notes', ellipsis: true }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>巡场记录管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          记录巡场
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
        title="记录巡场"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="zone" label="巡场区域" rules={[{ required: true, message: '请选择区域' }]}>
            <Select options={zones.map(z => ({ label: z, value: z }))} />
          </Form.Item>
          <Form.Item name="poolId" label="重点汤池（可选）">
            <Select
              placeholder="选择重点关注的汤池"
              allowClear
              options={pools.map(p => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="visitorDensity" label="游客密度" rules={[{ required: true, message: '请选择游客密度' }]}>
            <Select options={[
              { label: '空闲', value: '空闲' },
              { label: '正常', value: '正常' },
              { label: '较满', value: '较满' },
              { label: '爆满', value: '爆满' }
            ]} />
          </Form.Item>
          <Form.Item name="reminders" label="温馨提示情况">
            <Input.TextArea rows={2} placeholder="如：提醒游客注意防滑、不要长时间浸泡、老人小孩需陪同等等" />
          </Form.Item>
          <Form.Item name="issuesFound" label="发现的问题">
            <Input.TextArea rows={2} placeholder="如：地面有积水、汤池边缘有污渍、设备异常等" />
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
