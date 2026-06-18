import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space, Typography, Tag, Descriptions, message, Drawer } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, CheckOutlined, BellOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { poolAbnormalReportsApi, poolAbnormalDecisionsApi, guestNotificationsApi, retestRecordsApi, poolsApi, usersApi } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;

const abnormalTypeMap = {
  low_temperature: { color: 'blue', text: '水温偏低' },
  foam_abnormal: { color: 'cyan', text: '泡沫异常' },
  water_level_drop: { color: 'orange', text: '水位下降' },
  mineral_insufficient: { color: 'purple', text: '矿物质补水不足' }
};

const statusMap = {
  pending: { color: 'orange', text: '待处理' },
  processed: { color: 'blue', text: '已决策' },
  resolved: { color: 'green', text: '已解决' }
};

const decisionTypeMap = {
  water_supply: { color: 'blue', text: '补水' },
  water_change: { color: 'cyan', text: '换水' },
  maintenance: { color: 'orange', text: '维修' },
  closure: { color: 'red', text: '闭池' }
};

const retestResultMap = {
  pass: { color: 'green', text: '通过' },
  fail: { color: 'red', text: '不通过' }
};

export default function PoolAbnormal() {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState([]);
  const [pools, setPools] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [retestModalOpen, setRetestModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [reportForm] = Form.useForm();
  const [decisionForm] = Form.useForm();
  const [notificationForm] = Form.useForm();
  const [retestForm] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportsRes, poolsRes, usersRes] = await Promise.all([
        poolAbnormalReportsApi.list(),
        poolsApi.list(),
        usersApi.list()
      ]);
      setRecords(reportsRes.data);
      setPools(poolsRes.data);
      setUsers(usersRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReportSubmit = async (values) => {
    try {
      await poolAbnormalReportsApi.create({
        ...values,
        operatorId: currentUser.id,
        operatorName: currentUser.name
      });
      message.success('异常报告提交成功');
      setReportModalOpen(false);
      reportForm.resetFields();
      loadData();
    } catch (err) {
      message.error('提交失败');
    }
  };

  const handleDecisionSubmit = async (values) => {
    try {
      await poolAbnormalDecisionsApi.create({
        ...values,
        reportId: selectedRecord.id,
        poolId: selectedRecord.pool_id,
        operatorId: currentUser.id,
        operatorName: currentUser.name
      });
      message.success('处理决策提交成功');
      setDecisionModalOpen(false);
      setSelectedRecord(null);
      decisionForm.resetFields();
      loadData();
    } catch (err) {
      message.error('提交失败');
    }
  };

  const handleNotificationSubmit = async (values) => {
    try {
      await guestNotificationsApi.create({
        ...values,
        reportId: selectedRecord.id,
        poolId: selectedRecord.pool_id,
        operatorId: currentUser.id,
        operatorName: currentUser.name
      });
      message.success('通知已发送');
      setNotificationModalOpen(false);
      setSelectedRecord(null);
      notificationForm.resetFields();
      loadData();
    } catch (err) {
      message.error('发送失败');
    }
  };

  const handleRetestSubmit = async (values) => {
    try {
      await retestRecordsApi.create({
        ...values,
        reportId: selectedRecord.id,
        poolId: selectedRecord.pool_id,
        operatorId: currentUser.id,
        operatorName: currentUser.name
      });
      message.success('复测记录提交成功');
      setRetestModalOpen(false);
      setSelectedRecord(null);
      retestForm.resetFields();
      loadData();
    } catch (err) {
      message.error('提交失败');
    }
  };

  const openDetail = async (record) => {
    setSelectedRecord(record);
    try {
      const res = await poolAbnormalReportsApi.get(record.id);
      setDetailData(res.data);
    } catch (e) {
      setDetailData({ ...record, decisions: [], notifications: [], retests: [] });
    }
    setDrawerOpen(true);
  };

  const openDecisionModal = (record) => {
    setSelectedRecord(record);
    decisionForm.setFieldsValue({
      affectedPeopleCount: 0
    });
    setDecisionModalOpen(true);
  };

  const openNotificationModal = (record) => {
    setSelectedRecord(record);
    setNotificationModalOpen(true);
  };

  const openRetestModal = (record) => {
    setSelectedRecord(record);
    setRetestModalOpen(true);
  };

  const poolMap = Object.fromEntries(pools.map(p => [p.id, p.name]));
  const openPools = pools.filter(p => p.status === 'open');

  const columns = [
    {
      title: '报告时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm'),
      width: 160
    },
    {
      title: '汤池',
      dataIndex: 'pool_id',
      key: 'pool_id',
      render: (id) => poolMap[id] || '-'
    },
    {
      title: '异常类型',
      dataIndex: 'abnormal_type',
      key: 'abnormal_type',
      render: (s) => <Tag color={abnormalTypeMap[s]?.color}>{abnormalTypeMap[s]?.text || s}</Tag>
    },
    {
      title: '水温(°C)',
      dataIndex: 'temperature',
      key: 'temperature',
      render: (v) => v || '-'
    },
    {
      title: '水位',
      dataIndex: 'water_level',
      key: 'water_level',
      render: (v) => v ? `${v}cm` : '-'
    },
    {
      title: '矿物质',
      dataIndex: 'mineral_level',
      key: 'mineral_level',
      render: (v) => v ? `${v}mg/L` : '-'
    },
    {
      title: '泡沫',
      dataIndex: 'foam_level',
      key: 'foam_level',
      render: (v) => v || '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    { title: '报告人', dataIndex: 'operator_name', key: 'operator_name', width: 100 },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>详情</Button>
          {record.status === 'pending' && (currentUser.role === 'engineering' || currentUser.role === 'admin') && (
            <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => openDecisionModal(record)}>决策</Button>
          )}
          {(record.status === 'processed' || record.status === 'pending') && (currentUser.role === 'frontdesk' || currentUser.role === 'housekeeper' || currentUser.role === 'admin') && (
            <Button size="small" icon={<BellOutlined />} onClick={() => openNotificationModal(record)}>通知</Button>
          )}
          {record.status !== 'resolved' && (currentUser.role === 'water_quality' || currentUser.role === 'admin') && (
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => openRetestModal(record)}>复测</Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>汤池异常闭池管理</Title>
        {(currentUser.role === 'water_quality' || currentUser.role === 'admin') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setReportModalOpen(true)}>
            提交异常报告
          </Button>
        )}
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
        title="提交异常报告"
        open={reportModalOpen}
        onCancel={() => { setReportModalOpen(false); reportForm.resetFields(); }}
        footer={null}
        width={600}
      >
        <Form form={reportForm} onFinish={handleReportSubmit} layout="vertical">
          <Form.Item name="poolId" label="汤池" rules={[{ required: true, message: '请选择汤池' }]}>
            <Select
              placeholder="请选择汤池"
              options={openPools.map(p => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="abnormalType" label="异常类型" rules={[{ required: true, message: '请选择异常类型' }]}>
            <Select options={[
              { label: '水温偏低', value: 'low_temperature' },
              { label: '泡沫异常', value: 'foam_abnormal' },
              { label: '水位下降', value: 'water_level_drop' },
              { label: '矿物质补水不足', value: 'mineral_insufficient' }
            ]} />
          </Form.Item>
          <Form.Item name="temperature" label="当前水温(°C)">
            <InputNumber min={0} max={60} step={0.1} style={{ width: '100%' }} placeholder="请输入水温" />
          </Form.Item>
          <Form.Item name="waterLevel" label="水位(cm)">
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="请输入水位" />
          </Form.Item>
          <Form.Item name="mineralLevel" label="矿物质含量(mg/L)">
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="请输入矿物质含量" />
          </Form.Item>
          <Form.Item name="foamLevel" label="泡沫情况">
            <Select options={[
              { label: '无泡沫', value: '无泡沫' },
              { label: '少量泡沫', value: '少量泡沫' },
              { label: '中等泡沫', value: '中等泡沫' },
              { label: '大量泡沫', value: '大量泡沫' }
            ]} placeholder="请选择泡沫情况" />
          </Form.Item>
          <Form.Item name="readingData" label="读数数据" rules={[{ required: true, message: '请输入详细读数数据' }]}>
            <Input.TextArea rows={3} placeholder="请输入详细读数数据（必填，例如：水温35.2°C，浊度2.1NTU，pH值7.2等）" />
          </Form.Item>
          <Form.Item name="photoUrl" label="现场照片URL" rules={[{ required: true, message: '请填写现场照片URL' }, { type: 'url', message: '请输入有效的URL地址' }]}>
            <Input placeholder="请填写现场照片的可访问URL（必填，例如：https://example.com/photos/pool-001.jpg 或内部存储路径）" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="其他说明" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>提交报告</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="处理决策"
        open={decisionModalOpen}
        onCancel={() => { setDecisionModalOpen(false); setSelectedRecord(null); decisionForm.resetFields(); }}
        footer={null}
        width={500}
      >
        <Form form={decisionForm} onFinish={handleDecisionSubmit} layout="vertical">
          <Form.Item name="decisionType" label="决策类型" rules={[{ required: true, message: '请选择决策类型' }]}>
            <Select options={[
              { label: '补水', value: 'water_supply' },
              { label: '换水', value: 'water_change' },
              { label: '维修', value: 'maintenance' },
              { label: '闭池', value: 'closure' }
            ]} />
          </Form.Item>
          <Form.Item name="affectedPeopleCount" label="受影响人数">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入受影响人数" />
          </Form.Item>
          <Form.Item name="notes" label="决策说明">
            <Input.TextArea rows={3} placeholder="请详细说明决策依据和执行方案" rules={[{ required: true, message: '请输入决策说明' }]} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认决策</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="发送客人通知"
        open={notificationModalOpen}
        onCancel={() => { setNotificationModalOpen(false); setSelectedRecord(null); notificationForm.resetFields(); }}
        footer={null}
        width={500}
      >
        <Form form={notificationForm} onFinish={handleNotificationSubmit} layout="vertical">
          <Form.Item name="notificationType" label="通知类型" rules={[{ required: true, message: '请选择通知类型' }]}>
            <Select options={[
              { label: '改派游客', value: 'reassignment' },
              { label: '通知住客', value: 'guest_notification' },
              { label: '暂停接待', value: 'suspend_reception' }
            ]} />
          </Form.Item>
          <Form.Item name="targetRole" label="通知对象" rules={[{ required: true, message: '请选择通知对象' }]}>
            <Select options={[
              { label: '前厅-散客', value: 'frontdesk_walkin' },
              { label: '客房管家-住客', value: 'housekeeper_guest' },
              { label: '全部', value: 'all' }
            ]} />
          </Form.Item>
          <Form.Item name="affectedPeopleCount" label="受影响人数">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入受影响人数" />
          </Form.Item>
          <Form.Item name="reassignmentPlan" label="改派方案">
            <Input.TextArea rows={2} placeholder="请说明游客改派方案" />
          </Form.Item>
          <Form.Item name="messageContent" label="通知内容" rules={[{ required: true, message: '请输入通知内容' }]}>
            <Input.TextArea rows={3} placeholder="请输入要发送给客人的通知内容" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>发送通知</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="复测记录"
        open={retestModalOpen}
        onCancel={() => { setRetestModalOpen(false); setSelectedRecord(null); retestForm.resetFields(); }}
        footer={null}
        width={600}
      >
        <Form form={retestForm} onFinish={handleRetestSubmit} layout="vertical">
          <Form.Item name="temperature" label="复测水温(°C)">
            <InputNumber min={0} max={60} step={0.1} style={{ width: '100%' }} placeholder="请输入水温" />
          </Form.Item>
          <Form.Item name="waterLevel" label="复测水位(cm)">
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="请输入水位" />
          </Form.Item>
          <Form.Item name="mineralLevel" label="复测矿物质含量(mg/L)">
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="请输入矿物质含量" />
          </Form.Item>
          <Form.Item name="foamLevel" label="复测泡沫情况">
            <Select options={[
              { label: '无泡沫', value: '无泡沫' },
              { label: '少量泡沫', value: '少量泡沫' },
              { label: '中等泡沫', value: '中等泡沫' },
              { label: '大量泡沫', value: '大量泡沫' }
            ]} placeholder="请选择泡沫情况" />
          </Form.Item>
          <Form.Item name="readingData" label="复测读数数据">
            <Input.TextArea rows={3} placeholder="请输入详细复测读数" />
          </Form.Item>
          <Form.Item name="photoUrl" label="复测照片">
            <Input placeholder="请输入照片URL" />
          </Form.Item>
          <Form.Item name="result" label="复测结果" rules={[{ required: true, message: '请选择复测结果' }]}>
            <Select options={[
              { label: '通过', value: 'pass' },
              { label: '不通过', value: 'fail' }
            ]} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="其他说明" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>提交复测记录</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="异常报告详情"
        width={700}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {detailData && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="报告时间">{dayjs(detailData.created_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              <Descriptions.Item label="汤池">{poolMap[detailData.pool_id] || '-'}</Descriptions.Item>
              <Descriptions.Item label="异常类型">
                <Tag color={abnormalTypeMap[detailData.abnormal_type]?.color}>
                  {abnormalTypeMap[detailData.abnormal_type]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="水温">{detailData.temperature ? `${detailData.temperature}°C` : '-'}</Descriptions.Item>
              <Descriptions.Item label="水位">{detailData.water_level ? `${detailData.water_level}cm` : '-'}</Descriptions.Item>
              <Descriptions.Item label="矿物质">{detailData.mineral_level ? `${detailData.mineral_level}mg/L` : '-'}</Descriptions.Item>
              <Descriptions.Item label="泡沫">{detailData.foam_level || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[detailData.status]?.color}>{statusMap[detailData.status]?.text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="报告人">{detailData.operator_name}</Descriptions.Item>
              <Descriptions.Item label="读数数据">{detailData.reading_data || '-'}</Descriptions.Item>
              <Descriptions.Item label="现场照片">
                {detailData.photo_url ? (
                  <a href={detailData.photo_url} target="_blank" rel="noreferrer">查看照片</a>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="备注">{detailData.notes || '-'}</Descriptions.Item>
            </Descriptions>

            <Title level={5}>处理决策记录</Title>
            {detailData.decisions?.length > 0 ? (
              <Table
                size="small"
                dataSource={detailData.decisions}
                rowKey="id"
                pagination={false}
                columns={[
                  { title: '时间', dataIndex: 'created_at', render: t => dayjs(t).format('MM-DD HH:mm') },
                  { title: '决策类型', dataIndex: 'decision_type', render: s => <Tag color={decisionTypeMap[s]?.color}>{decisionTypeMap[s]?.text}</Tag> },
                  { title: '受影响人数', dataIndex: 'affected_people_count' },
                  { title: '决策人', dataIndex: 'operator_name' },
                  { title: '说明', dataIndex: 'notes' }
                ]}
                style={{ marginBottom: 16 }}
              />
            ) : (
              <p style={{ color: '#999', marginBottom: 16 }}>暂无决策记录</p>
            )}

            <Title level={5}>客人通知记录</Title>
            {detailData.notifications?.length > 0 ? (
              <Table
                size="small"
                dataSource={detailData.notifications}
                rowKey="id"
                pagination={false}
                columns={[
                  { title: '时间', dataIndex: 'notified_at', render: t => dayjs(t).format('MM-DD HH:mm') },
                  { title: '类型', dataIndex: 'notification_type' },
                  { title: '通知对象', dataIndex: 'target_role' },
                  { title: '受影响人数', dataIndex: 'affected_people_count' },
                  { title: '通知人', dataIndex: 'operator_name' }
                ]}
                style={{ marginBottom: 16 }}
              />
            ) : (
              <p style={{ color: '#999', marginBottom: 16 }}>暂无通知记录</p>
            )}

            <Title level={5}>复测记录</Title>
            {detailData.retests?.length > 0 ? (
              <Table
                size="small"
                dataSource={detailData.retests}
                rowKey="id"
                pagination={false}
                columns={[
                  { title: '时间', dataIndex: 'created_at', render: t => dayjs(t).format('MM-DD HH:mm') },
                  { title: '水温', dataIndex: 'temperature', render: v => v ? `${v}°C` : '-' },
                  { title: '水位', dataIndex: 'water_level', render: v => v ? `${v}cm` : '-' },
                  { title: '矿物质', dataIndex: 'mineral_level', render: v => v ? `${v}mg/L` : '-' },
                  { title: '读数数据', dataIndex: 'reading_data', render: v => v ? v.length > 15 ? v.slice(0, 15) + '...' : v : '-' },
                  { title: '复测照片', dataIndex: 'photo_url', render: v => v ? <a href={v} target="_blank" rel="noreferrer">查看</a> : '-' },
                  { title: '结果', dataIndex: 'result', render: s => <Tag color={retestResultMap[s]?.color}>{retestResultMap[s]?.text}</Tag> },
                  { title: '复测人', dataIndex: 'operator_name' }
                ]}
              />
            ) : (
              <p style={{ color: '#999' }}>暂无复测记录</p>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
