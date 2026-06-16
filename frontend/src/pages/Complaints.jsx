import { useState, useEffect } from 'react';
import { Card } from 'antd';
import { Table } from 'antd';
import { Button } from 'antd';
import { Modal } from 'antd';
import { Form } from 'antd';
import { Input } from 'antd';
import { InputNumber } from 'antd';
import { Select } from 'antd';
import { Space } from 'antd';
import { Typography } from 'antd';
import { Tag } from 'antd';
import { Switch } from 'antd';
import { Descriptions } from 'antd';
import { message } from 'antd';
import { Drawer } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { complaintsApi, poolsApi, usersApi, compensationsApi } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;

const statusMap = {
  pending: { color: 'orange', text: '待处理' },
  processing: { color: 'blue', text: '处理中' },
  resolved: { color: 'green', text: '已解决' },
  closed: { color: 'default', text: '已关闭' }
};

export default function Complaints() {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState([]);
  const [pools, setPools] = useState([]);
  const [handlers, setHandlers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [compensationModalOpen, setCompensationModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [form] = Form.useForm();
  const [updateForm] = Form.useForm();
  const [compensationForm] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsRes, poolsRes, usersRes] = await Promise.all([
        complaintsApi.list(),
        poolsApi.list(),
        usersApi.list({ role: 'customer_service' })
      ]);
      setRecords(recordsRes.data);
      setPools(poolsRes.data);
      setHandlers(usersRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (values) => {
    try {
      await complaintsApi.create({
        ...values,
        rescueInvolved: values.rescueInvolved ? 1 : 0,
        handlerId: currentUser.id,
        handlerName: currentUser.name
      });
      message.success('投诉记录添加成功');
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error('添加失败');
    }
  };

  const handleUpdate = async (values) => {
    try {
      await complaintsApi.update(selectedRecord.id, values);
      message.success('更新成功');
      setUpdateModalOpen(false);
      setSelectedRecord(null);
      loadData();
    } catch (err) {
      message.error('更新失败');
    }
  };

  const handleCompensation = async (values) => {
    try {
      await compensationsApi.create({
        ...values,
        complaintId: selectedRecord.id,
        operatorId: currentUser.id,
        operatorName: currentUser.name
      });
      message.success('赔付方案已创建');
      setCompensationModalOpen(false);
      setSelectedRecord(null);
      loadData();
    } catch (err) {
      message.error('创建失败');
    }
  };

  const openDetail = async (record) => {
    setSelectedRecord(record);
    try {
      const res = await complaintsApi.get(record.id);
      setDetailData(res.data);
    } catch (e) {
      setDetailData({ ...record, compensations: [] });
    }
    setDrawerOpen(true);
  };

  const openUpdateModal = (record) => {
    setSelectedRecord(record);
    updateForm.setFieldsValue({
      status: record.status,
      handlerId: record.handler_id,
      handlerName: record.handler_name
    });
    setUpdateModalOpen(true);
  };

  const openCompensationModal = (record) => {
    setSelectedRecord(record);
    setCompensationModalOpen(true);
  };

  const poolMap = Object.fromEntries(pools.map(p => [p.id, p.name]));
  const zones = [...new Set(pools.map(p => p.zone))];

  const columns = [
    {
      title: '受理时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
      width: 160
    },
    {
      title: '关联汤池',
      dataIndex: 'pool_id',
      key: 'pool_id',
      render: (id) => id ? poolMap[id] : '-'
    },
    { title: '区域', dataIndex: 'zone', key: 'zone' },
    { title: '监控点位', dataIndex: 'monitor_point', key: 'monitor_point' },
    { title: '投诉类型', dataIndex: 'complaint_type', key: 'complaint_type' },
    { title: '客户姓名', dataIndex: 'customer_name', key: 'customer_name' },
    {
      title: '是否涉及救助',
      dataIndex: 'rescue_involved',
      key: 'rescue_involved',
      render: (v) => v ? <Tag color="red">是</Tag> : <Tag>否</Tag>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    { title: '处理人', dataIndex: 'handler_name', key: 'handler_name' },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>详情</Button>
          <Button size="small" onClick={() => openUpdateModal(record)}>处理</Button>
          <Button size="small" type="primary" onClick={() => openCompensationModal(record)}>赔付</Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>客诉处理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          登记投诉
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
        title="登记客诉"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="poolId" label="关联汤池">
            <Select
              placeholder="选择关联汤池（可选）"
              allowClear
              options={pools.map(p => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="zone" label="所在区域">
            <Select
              placeholder="选择所在区域"
              allowClear
              options={zones.map(z => ({ label: z, value: z }))}
            />
          </Form.Item>
          <Form.Item name="monitorPoint" label="监控点位">
            <Input placeholder="如：A区东侧摄像头3号" />
          </Form.Item>
          <Form.Item name="customerName" label="客户姓名">
            <Input placeholder="请输入客户姓名" />
          </Form.Item>
          <Form.Item name="customerPhone" label="联系电话">
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item name="complaintType" label="投诉类型" rules={[{ required: true, message: '请选择投诉类型' }]}>
            <Select options={[
              { label: '水温问题', value: '水温问题' },
              { label: '水质问题', value: '水质问题' },
              { label: '卫生问题', value: '卫生问题' },
              { label: '服务态度', value: '服务态度' },
              { label: '设施故障', value: '设施故障' },
              { label: '安全事故', value: '安全事故' },
              { label: '滑倒摔伤', value: '滑倒摔伤' },
              { label: '其他问题', value: '其他问题' }
            ]} />
          </Form.Item>
          <Form.Item name="rescueInvolved" label="是否涉及医疗救助" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="description" label="投诉详情" rules={[{ required: true, message: '请输入投诉详情' }]}>
            <Input.TextArea rows={4} placeholder="请详细描述投诉内容，包括时间、地点、人物、经过等" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认提交</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="处理客诉"
        open={updateModalOpen}
        onCancel={() => { setUpdateModalOpen(false); setSelectedRecord(null); }}
        footer={null}
      >
        <Form form={updateForm} onFinish={handleUpdate} layout="vertical">
          <Form.Item name="status" label="投诉状态" rules={[{ required: true }]}>
            <Select options={[
              { label: '待处理', value: 'pending' },
              { label: '处理中', value: 'processing' },
              { label: '已解决', value: 'resolved' },
              { label: '已关闭', value: 'closed' }
            ]} />
          </Form.Item>
          <Form.Item name="handlerId" label="处理人">
            <Select
              placeholder="选择处理人"
              allowClear
              labelInValue
              options={handlers.map(u => ({ label: u.name, value: u.id }))}
              onChange={(val) => {
                if (val) {
                  updateForm.setFieldsValue({ handlerName: val.label });
                } else {
                  updateForm.setFieldsValue({ handlerName: undefined });
                }
              }}
            />
          </Form.Item>
          <Form.Item name="handlerName" hidden>
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认更新</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`创建赔付方案 - 投诉#${selectedRecord?.id?.slice(-6)}`}
        open={compensationModalOpen}
        onCancel={() => { setCompensationModalOpen(false); setSelectedRecord(null); }}
        footer={null}
      >
        <Form form={compensationForm} onFinish={handleCompensation} layout="vertical">
          <Form.Item name="amount" label="赔付金额(元)" rules={[{ required: true, message: '请输入赔付金额' }]}>
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="compensationMethod" label="赔付方式" rules={[{ required: true, message: '请选择赔付方式' }]}>
            <Select options={[
              { label: '现金赔付', value: '现金赔付' },
              { label: '退款', value: '退款' },
              { label: '赠券/免单', value: '赠券/免单' },
              { label: '赠送服务', value: '赠送服务' },
              { label: 'VIP升级', value: 'VIP升级' },
              { label: '其他方式', value: '其他方式' }
            ]} />
          </Form.Item>
          <Form.Item name="planDescription" label="赔付方案说明" rules={[{ required: true, message: '请描述赔付方案' }]}>
            <Input.TextArea rows={3} placeholder="请详细说明赔付方案和处理结果" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认提交赔付方案</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`投诉详情 - ${selectedRecord?.complaint_type || ''}`}
        width={600}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {detailData && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="投诉类型">{detailData.complaint_type}</Descriptions.Item>
              <Descriptions.Item label="受理时间">
                {dayjs(detailData.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="关联汤池">
                {detailData.pool_id ? poolMap[detailData.pool_id] : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="区域">{detailData.zone || '-'}</Descriptions.Item>
              <Descriptions.Item label="监控点位">{detailData.monitor_point || '-'}</Descriptions.Item>
              <Descriptions.Item label="客户姓名">{detailData.customer_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{detailData.customer_phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="涉及救助">
                {detailData.rescue_involved ? <Tag color="red">是</Tag> : <Tag>否</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[detailData.status]?.color}>
                  {statusMap[detailData.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="处理人">{detailData.handler_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="投诉详情">{detailData.description}</Descriptions.Item>
            </Descriptions>

            <Title level={5}>关联赔付记录</Title>
            {detailData.compensations?.length > 0 ? (
              <Table
                size="small"
                dataSource={detailData.compensations}
                rowKey="id"
                pagination={false}
                columns={[
                  { title: '时间', dataIndex: 'created_at', render: t => dayjs(t).format('MM-DD HH:mm') },
                  { title: '金额(元)', dataIndex: 'amount' },
                  { title: '方式', dataIndex: 'compensation_method' },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    render: s => <Tag color={s === 'approved' ? 'green' : s === 'pending' ? 'orange' : 'default'}>
                      {s === 'approved' ? '已批准' : s === 'pending' ? '待审批' : s}
                    </Tag>
                  },
                  { title: '经办人', dataIndex: 'operator_name' }
                ]}
              />
            ) : (
              <p style={{ color: '#999' }}>暂无赔付记录</p>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
