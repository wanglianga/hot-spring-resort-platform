import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space, Typography, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { compensationsApi, complaintsApi, usersApi } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;

const statusMap = {
  pending: { color: 'orange', text: '待审批' },
  approved: { color: 'green', text: '已批准' },
  rejected: { color: 'red', text: '已拒绝' },
  paid: { color: 'blue', text: '已赔付' }
};

export default function Compensations() {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [updateForm] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsRes, complaintsRes, approversRes] = await Promise.all([
        compensationsApi.list(),
        complaintsApi.list(),
        usersApi.list({ role: 'admin' })
      ]);
      setRecords(recordsRes.data);
      setComplaints(complaintsRes.data);
      setApprovers(approversRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdate = async (values) => {
    try {
      await compensationsApi.update(selectedRecord.id, values);
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
      approverId: record.approver_id,
      approverName: record.approver_name
    });
    setUpdateModalOpen(true);
  };

  const complaintMap = Object.fromEntries(complaints.map(c => [c.id, c]));

  const columns = [
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
      width: 160
    },
    {
      title: '关联投诉',
      dataIndex: 'complaint_id',
      key: 'complaint_id',
      render: (id) => {
        const c = complaintMap[id];
        return c ? (
          <div>
            <div>{c.complaint_type}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{c.customer_name || '匿名'}</div>
          </div>
        ) : id?.slice(-6);
      }
    },
    { title: '赔付金额(元)', dataIndex: 'amount', key: 'amount', render: v => `¥${v}` },
    { title: '赔付方式', dataIndex: 'compensation_method', key: 'compensation_method' },
    { title: '方案说明', dataIndex: 'plan_description', key: 'plan_description', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>
    },
    { title: '审批人', dataIndex: 'approver_name', key: 'approver_name' },
    { title: '经办人', dataIndex: 'operator_name', key: 'operator_name', width: 100 },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button size="small" onClick={() => openUpdateModal(record)}>审批</Button>
      )
    }
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0, marginBottom: 16 }}>赔付管理</Title>

      <Card loading={loading}>
        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="赔付审批"
        open={updateModalOpen}
        onCancel={() => { setUpdateModalOpen(false); setSelectedRecord(null); }}
        footer={null}
      >
        <Form form={updateForm} onFinish={handleUpdate} layout="vertical">
          <Form.Item name="status" label="赔付状态" rules={[{ required: true }]}>
            <Select options={[
              { label: '待审批', value: 'pending' },
              { label: '已批准', value: 'approved' },
              { label: '已拒绝', value: 'rejected' },
              { label: '已赔付', value: 'paid' }
            ]} />
          </Form.Item>
          <Form.Item name="approverId" label="审批人">
            <Select
              placeholder="选择审批人"
              allowClear
              labelInValue
              options={approvers.map(u => ({ label: u.name, value: u.id }))}
              onChange={(val) => {
                if (val) {
                  updateForm.setFieldsValue({ approverName: val.label });
                } else {
                  updateForm.setFieldsValue({ approverName: undefined });
                }
              }}
            />
          </Form.Item>
          <Form.Item name="approverName" hidden>
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认审批</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
