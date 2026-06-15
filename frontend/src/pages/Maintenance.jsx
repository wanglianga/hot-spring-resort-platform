import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space, Typography, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { maintenanceApi, poolsApi, usersApi } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;

const statusMap = {
  pending: { color: 'orange', text: '待处理' },
  processing: { color: 'blue', text: '处理中' },
  completed: { color: 'green', text: '已完成' }
};

const priorityMap = {
  low: { color: 'default', text: '低' },
  normal: { color: 'blue', text: '普通' },
  high: { color: 'red', text: '高' }
};

export default function Maintenance() {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState([]);
  const [pools, setPools] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form] = Form.useForm();
  const [updateForm] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsRes, poolsRes, usersRes] = await Promise.all([
        maintenanceApi.list(),
        poolsApi.list(),
        usersApi.list({ role: 'engineering' })
      ]);
      setRecords(recordsRes.data);
      setPools(poolsRes.data);
      setEngineers(usersRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (values) => {
    try {
      await maintenanceApi.create({
        ...values,
        operatorId: currentUser.id,
        operatorName: currentUser.name
      });
      message.success('维修工单创建成功');
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error('创建失败');
    }
  };

  const handleUpdate = async (values) => {
    try {
      await maintenanceApi.update(selectedRecord.id, values);
      message.success('更新成功');
      setUpdateModalOpen(false);
      setSelectedRecord(null);
      loadData();
    } catch (err) {
      message.error('更新失败');
    }
  };

  const openUpdateModal = (record) => {
    setSelectedRecord(record);
    updateForm.setFieldsValue({
      status: record.status,
      assigneeId: record.assignee_id,
      assigneeName: record.assignee_name,
      resolution: record.resolution
    });
    setUpdateModalOpen(true);
  };

  const poolMap = Object.fromEntries(pools.map(p => [p.id, p.name]));

  const columns = [
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
      width: 160
    },
    {
      title: '关联汤池',
      dataIndex: 'pool_id',
      key: 'pool_id',
      render: (id) => id ? poolMap[id] : '无'
    },
    { title: '设备类型', dataIndex: 'equipment_type', key: 'equipment_type' },
    { title: '问题描述', dataIndex: 'issue_description', key: 'issue_description', ellipsis: true },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (p) => <Tag color={priorityMap[p]?.color}>{priorityMap[p]?.text}</Tag>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    { title: '处理人', dataIndex: 'assignee_name', key: 'assignee_name' },
    { title: '报修人', dataIndex: 'operator_name', key: 'operator_name', width: 100 },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button size="small" onClick={() => openUpdateModal(record)}>处理</Button>
      ),
      width: 80
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>设备维修管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          创建维修工单
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
        title="创建维修工单"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="poolId" label="关联汤池">
            <Select
              placeholder="选择汤池（可选）"
              allowClear
              options={pools.map(p => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="equipmentType" label="设备类型" rules={[{ required: true, message: '请选择设备类型' }]}>
            <Select options={[
              { label: '水泵', value: '水泵' },
              { label: '排污泵', value: '排污泵' },
              { label: '加热设备', value: '加热设备' },
              { label: '循环系统', value: '循环系统' },
              { label: '过滤设备', value: '过滤设备' },
              { label: '其他', value: '其他' }
            ]} />
          </Form.Item>
          <Form.Item name="issueDescription" label="问题描述" rules={[{ required: true, message: '请输入问题描述' }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="priority" label="优先级">
            <Select defaultValue="normal" options={[
              { label: '低', value: 'low' },
              { label: '普通', value: 'normal' },
              { label: '高', value: 'high' }
            ]} />
          </Form.Item>
          <Form.Item name="assigneeId" label="指派处理人">
            <Select
              placeholder="选择处理人（可选）"
              allowClear
              labelInValue
              options={engineers.map(u => ({ label: u.name, value: u.id }))}
              onChange={(val) => {
                if (val) {
                  form.setFieldsValue({ assigneeName: val.label });
                } else {
                  form.setFieldsValue({ assigneeName: undefined });
                }
              }}
            />
          </Form.Item>
          <Form.Item name="assigneeName" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>提交工单</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="处理维修工单"
        open={updateModalOpen}
        onCancel={() => { setUpdateModalOpen(false); setSelectedRecord(null); }}
        footer={null}
      >
        <Form form={updateForm} onFinish={handleUpdate} layout="vertical">
          <Form.Item name="status" label="工单状态" rules={[{ required: true }]}>
            <Select options={[
              { label: '待处理', value: 'pending' },
              { label: '处理中', value: 'processing' },
              { label: '已完成', value: 'completed' }
            ]} />
          </Form.Item>
          <Form.Item name="assigneeId" label="处理人">
            <Select
              placeholder="选择处理人"
              allowClear
              labelInValue
              options={engineers.map(u => ({ label: u.name, value: u.id }))}
              onChange={(val) => {
                if (val) {
                  updateForm.setFieldsValue({ assigneeName: val.label });
                } else {
                  updateForm.setFieldsValue({ assigneeName: undefined });
                }
              }}
            />
          </Form.Item>
          <Form.Item name="assigneeName" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="resolution" label="处理结果">
            <Input.TextArea rows={3} placeholder="请填写处理结果" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认更新</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
