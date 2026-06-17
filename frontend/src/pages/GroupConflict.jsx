import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space, Typography, Tag, Descriptions, message, Drawer, DatePicker, Switch } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, ClockCircleOutlined, WarningOutlined, GiftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { groupConflictsApi, conflictAdjustmentsApi, poolsApi, complaintsApi, compensationsApi } from '../api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;

const statusMap = {
  pending: { color: 'orange', text: '待处理' },
  adjusted: { color: 'blue', text: '已调整' },
  resolved: { color: 'green', text: '已解决' },
  complaint: { color: 'red', text: '有投诉' }
};

export default function GroupConflict() {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState([]);
  const [pools, setPools] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [compensations, setCompensations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [arrivalModalOpen, setArrivalModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [conflictForm] = Form.useForm();
  const [adjustmentForm] = Form.useForm();
  const [arrivalForm] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [conflictsRes, poolsRes, complaintsRes, compensationsRes] = await Promise.all([
        groupConflictsApi.list(),
        poolsApi.list(),
        complaintsApi.list(),
        compensationsApi.list()
      ]);
      setRecords(conflictsRes.data);
      setPools(poolsRes.data);
      setComplaints(complaintsRes.data);
      setCompensations(compensationsRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConflictSubmit = async (values) => {
    try {
      await groupConflictsApi.create({
        ...values,
        originalArrivalTime: values.originalArrivalTime?.toISOString(),
        actualArrivalTime: values.actualArrivalTime?.toISOString(),
        scheduledStartTime: values.scheduledStartTime?.toISOString(),
        scheduledEndTime: values.scheduledEndTime?.toISOString(),
        operatorId: currentUser.id,
        operatorName: currentUser.name
      });
      message.success('冲突登记成功');
      setConflictModalOpen(false);
      conflictForm.resetFields();
      loadData();
    } catch (err) {
      message.error('登记失败');
    }
  };

  const handleAdjustmentSubmit = async (values) => {
    try {
      await conflictAdjustmentsApi.create({
        ...values,
        conflictId: selectedRecord.id,
        poolId: selectedRecord.pool_id,
        finalPoolArrivalTime: values.finalPoolArrivalTime?.toISOString(),
        walkinAgreed: values.walkinAgreed ? 1 : 0,
        operatorId: currentUser.id,
        operatorName: currentUser.name
      });
      message.success('调整方案已提交');
      setAdjustmentModalOpen(false);
      setSelectedRecord(null);
      adjustmentForm.resetFields();
      loadData();
    } catch (err) {
      message.error('提交失败');
    }
  };

  const handleArrivalSubmit = async (values) => {
    try {
      await groupConflictsApi.updateArrival(selectedRecord.id, {
        actualArrivalTime: values.actualArrivalTime?.toISOString()
      });
      message.success('实际到达时间已更新');
      setArrivalModalOpen(false);
      setSelectedRecord(null);
      arrivalForm.resetFields();
      loadData();
    } catch (err) {
      message.error('更新失败');
    }
  };

  const openDetail = async (record) => {
    setSelectedRecord(record);
    try {
      const res = await groupConflictsApi.get(record.id);
      setDetailData(res.data);
    } catch (e) {
      setDetailData({ ...record, adjustments: [] });
    }
    setDrawerOpen(true);
  };

  const openAdjustmentModal = (record) => {
    setSelectedRecord(record);
    adjustmentForm.setFieldsValue({
      compensationAmount: 0,
      walkinAgreed: false
    });
    setAdjustmentModalOpen(true);
  };

  const openArrivalModal = (record) => {
    setSelectedRecord(record);
    setArrivalModalOpen(true);
  };

  const poolMap = Object.fromEntries(pools.map(p => [p.id, p.name]));
  const openPools = pools.filter(p => p.status === 'open');
  const complaintMap = Object.fromEntries(complaints.map(c => [c.id, `#${c.id.slice(-6)} - ${c.complaint_type}`]));
  const compensationMap = Object.fromEntries(compensations.map(c => [c.id, `#${c.id.slice(-6)} - ¥${c.amount}`]));

  const columns = [
    {
      title: '登记时间',
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
    { title: '团客名称', dataIndex: 'group_name', key: 'group_name' },
    { title: '团客人数', dataIndex: 'group_people_count', key: 'group_people_count' },
    {
      title: '原定到达时间',
      dataIndex: 'original_arrival_time',
      key: 'original_arrival_time',
      render: (t) => dayjs(t).format('MM-DD HH:mm'),
      width: 140
    },
    {
      title: '实际到达时间',
      dataIndex: 'actual_arrival_time',
      key: 'actual_arrival_time',
      render: (t) => t ? dayjs(t).format('MM-DD HH:mm') : <Tag color="orange">未到达</Tag>,
      width: 140
    },
    {
      title: '受影响散客',
      dataIndex: 'affected_walkin_count',
      key: 'affected_walkin_count'
    },
    {
      title: '冲突原因',
      dataIndex: 'conflict_reason',
      key: 'conflict_reason'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    { title: '登记人', dataIndex: 'operator_name', key: 'operator_name', width: 100 },
    {
      title: '操作',
      key: 'action',
      width: 260,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>详情</Button>
          {!record.actual_arrival_time && (currentUser.role === 'frontdesk' || currentUser.role === 'admin') && (
            <Button size="small" icon={<ClockCircleOutlined />} onClick={() => openArrivalModal(record)}>到店</Button>
          )}
          {record.status === 'pending' && (currentUser.role === 'frontdesk' || currentUser.role === 'admin') && (
            <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => openAdjustmentModal(record)}>调整</Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>团客时段冲突管理</Title>
        {(currentUser.role === 'frontdesk' || currentUser.role === 'admin') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setConflictModalOpen(true)}>
            登记冲突
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
        title="登记团客时段冲突"
        open={conflictModalOpen}
        onCancel={() => { setConflictModalOpen(false); conflictForm.resetFields(); }}
        footer={null}
        width={600}
      >
        <Form form={conflictForm} onFinish={handleConflictSubmit} layout="vertical">
          <Form.Item name="poolId" label="包池汤池" rules={[{ required: true, message: '请选择汤池' }]}>
            <Select
              placeholder="请选择包池汤池"
              options={openPools.map(p => ({ label: `${p.name} (容量${p.capacity}人)`, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="groupName" label="团客名称" rules={[{ required: true, message: '请输入团客名称' }]}>
            <Input placeholder="如：XX旅行社VIP团" />
          </Form.Item>
          <Form.Item name="groupPeopleCount" label="团客人数">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入团客人数" />
          </Form.Item>
          <Form.Item name="originalArrivalTime" label="原定到达时间" rules={[{ required: true, message: '请选择原定到达时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="actualArrivalTime" label="实际到达时间（如已到店）">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="scheduledStartTime" label="包池开始时间" rules={[{ required: true, message: '请选择包池开始时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="scheduledEndTime" label="包池结束时间" rules={[{ required: true, message: '请选择包池结束时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="conflictReason" label="冲突原因" rules={[{ required: true, message: '请输入冲突原因' }]}>
            <Select options={[
              { label: '团客延迟到达-包池与散客预约重叠', value: '团客延迟到达-包池与散客预约重叠' },
              { label: '散客超员预约', value: '散客超员预约' },
              { label: '其他原因', value: '其他原因' }
            ]} />
          </Form.Item>
          <Form.Item name="affectedWalkinCount" label="受影响散客人数">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入受影响散客人数" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="其他说明" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认登记</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="登记实际到达时间"
        open={arrivalModalOpen}
        onCancel={() => { setArrivalModalOpen(false); setSelectedRecord(null); arrivalForm.resetFields(); }}
        footer={null}
        width={400}
      >
        <Form form={arrivalForm} onFinish={handleArrivalSubmit} layout="vertical">
          <Form.Item name="actualArrivalTime" label="实际到达时间" rules={[{ required: true, message: '请选择实际到达时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认到店</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="冲突调整方案"
        open={adjustmentModalOpen}
        onCancel={() => { setAdjustmentModalOpen(false); setSelectedRecord(null); adjustmentForm.resetFields(); }}
        footer={null}
        width={650}
      >
        <Form form={adjustmentForm} onFinish={handleAdjustmentSubmit} layout="vertical">
          <Form.Item name="entryOrder" label="入场顺序调整">
            <Select options={[
              { label: '团客优先入场', value: '团客优先入场' },
              { label: '散客优先入场', value: '散客优先入场' },
              { label: '分时入场', value: '分时入场' },
              { label: '混合入场', value: '混合入场' }
            ]} placeholder="请选择入场顺序调整方案" />
          </Form.Item>
          <Form.Item name="cateringArrangement" label="餐饮衔接安排">
            <Input.TextArea rows={2} placeholder="请说明餐饮衔接安排，如：为等待游客提供免费点心、茶水等" />
          </Form.Item>
          <Form.Item name="poolChangePlan" label="换池方案">
            <Select
              placeholder="请选择换池方案"
              options={openPools.filter(p => p.id !== selectedRecord?.pool_id).map(p => ({ label: `更换至${p.name}`, value: `更换至${p.name}` }))}
              allowClear
            />
          </Form.Item>
          <Form.Item name="compensationAmount" label="补偿金额(元)">
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="请输入补偿金额" />
          </Form.Item>
          <Form.Item name="compensationVouchers" label="补偿券">
            <Select
              mode="multiple"
              placeholder="请选择或输入补偿券类型"
              options={[
                { label: '免费入场券', value: '免费入场券' },
                { label: '餐饮抵扣券', value: '餐饮抵扣券' },
                { label: 'VIP升级券', value: 'VIP升级券' },
                { label: '下次消费折扣券', value: '下次消费折扣券' }
              ]}
              allowClear
            />
          </Form.Item>
          <Form.Item name="receptionRhythm" label="新的接待节奏（池区服务员可见）">
            <Input.TextArea rows={2} placeholder="请描述新的接待节奏，如：14:00-15:00散客优先，15:00后团客入场" rules={[{ required: true, message: '请填写接待节奏' }]} />
          </Form.Item>
          <Form.Item name="walkinAgreed" label="散客是否同意调整" valuePropName="checked">
            <Switch checkedChildren="同意" unCheckedChildren="不同意" />
          </Form.Item>
          <Form.Item name="finalPoolArrivalTime" label="最终到池时间">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="complaintId" label="关联投诉（如散客不同意）">
            <Select
              placeholder="选择关联的投诉记录"
              options={complaints.map(c => ({ label: complaintMap[c.id], value: c.id }))}
              allowClear
            />
          </Form.Item>
          <Form.Item name="compensationId" label="关联赔付">
            <Select
              placeholder="选择关联的赔付记录"
              options={compensations.map(c => ({ label: compensationMap[c.id], value: c.id }))}
              allowClear
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block icon={<GiftOutlined />}>提交调整方案</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="团客冲突详情"
        width={700}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {detailData && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="登记时间">{dayjs(detailData.created_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              <Descriptions.Item label="汤池">{poolMap[detailData.pool_id] || '-'}</Descriptions.Item>
              <Descriptions.Item label="团客名称">{detailData.group_name}</Descriptions.Item>
              <Descriptions.Item label="团客人数">{detailData.group_people_count}人</Descriptions.Item>
              <Descriptions.Item label="原定到达时间">{dayjs(detailData.original_arrival_time).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="实际到达时间">
                {detailData.actual_arrival_time ? dayjs(detailData.actual_arrival_time).format('YYYY-MM-DD HH:mm') : <Tag color="orange">未到达</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="包池时段">
                {dayjs(detailData.scheduled_start_time).format('MM-DD HH:mm')} ~ {dayjs(detailData.scheduled_end_time).format('MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="受影响散客">{detailData.affected_walkin_count || 0}人</Descriptions.Item>
              <Descriptions.Item label="冲突原因">{detailData.conflict_reason}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[detailData.status]?.color}>{statusMap[detailData.status]?.text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="登记人">{detailData.operator_name}</Descriptions.Item>
              <Descriptions.Item label="备注">{detailData.notes || '-'}</Descriptions.Item>
            </Descriptions>

            <Title level={5}>调整方案记录</Title>
            {detailData.adjustments?.length > 0 ? (
              detailData.adjustments.map((adj, idx) => (
                <Card key={adj.id} size="small" style={{ marginBottom: 12 }}>
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="调整时间" span={2}>{dayjs(adj.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                    <Descriptions.Item label="入场顺序">{adj.entry_order || '-'}</Descriptions.Item>
                    <Descriptions.Item label="补偿金额">{adj.compensation_amount ? `¥${adj.compensation_amount}` : '-'}</Descriptions.Item>
                    <Descriptions.Item label="餐饮安排" span={2}>{adj.catering_arrangement || '-'}</Descriptions.Item>
                    <Descriptions.Item label="换池方案" span={2}>{adj.pool_change_plan || '-'}</Descriptions.Item>
                    <Descriptions.Item label="补偿券" span={2}>{adj.compensation_vouchers || '-'}</Descriptions.Item>
                    <Descriptions.Item label="散客同意">
                      {adj.walkin_agreed ? <Tag color="green">是</Tag> : <Tag color="red">否</Tag>}
                    </Descriptions.Item>
                    <Descriptions.Item label="最终到池时间">
                      {adj.final_pool_arrival_time ? dayjs(adj.final_pool_arrival_time).format('MM-DD HH:mm') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="关联投诉">{adj.complaint_id ? complaintMap[adj.complaint_id] || adj.complaint_id : '-'}</Descriptions.Item>
                    <Descriptions.Item label="关联赔付">{adj.compensation_id ? compensationMap[adj.compensation_id] || adj.compensation_id : '-'}</Descriptions.Item>
                    <Descriptions.Item label="接待节奏" span={2}>{adj.reception_rhythm || '-'}</Descriptions.Item>
                    <Descriptions.Item label="经办人" span={2}>{adj.operator_name}</Descriptions.Item>
                  </Descriptions>
                </Card>
              ))
            ) : (
              <p style={{ color: '#999' }}>暂无调整方案记录</p>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
