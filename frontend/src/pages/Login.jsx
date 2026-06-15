import { useState } from 'react';
import { Card, Form, Select, Button, Typography, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api';
import { useEffect } from 'react';

const { Title, Text } = Typography;

export default function Login() {
  const { login, getRoleName } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    usersApi.list().then(res => setUsers(res.data));
  }, []);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await login(values.username);
      message.success('登录成功');
    } catch (err) {
      message.error('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #13c2c2 0%, #08979c 100%)'
    }}>
      <Card style={{ width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, color: '#13c2c2', marginBottom: 12 }}>♨️</div>
          <Title level={3} style={{ margin: 0 }}>温泉度假区管理平台</Title>
          <Text type="secondary">汤池维护与客诉处理系统</Text>
        </div>
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="username"
            label="选择身份登录"
            rules={[{ required: true, message: '请选择登录身份' }]}
          >
            <Select
              placeholder="请选择您的身份"
              size="large"
              prefix={<UserOutlined />}
              options={users.map(u => ({
                label: `${u.name} - ${getRoleName(u.role)}`,
                value: u.username
              }))}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              登录系统
            </Button>
          </Form.Item>
        </Form>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', fontSize: 12 }}>
          测试账号已预置，可直接选择身份登录
        </Text>
      </Card>
    </div>
  );
}
