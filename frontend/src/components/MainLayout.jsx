import { Layout, Menu, Button, Dropdown, Avatar, Badge } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  FundOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
  DesktopOutlined,
  EyeOutlined,
  WarningOutlined,
  MoneyCollectOutlined,
  LogoutOutlined,
  UserOutlined,
  BellOutlined,
  ThunderboltOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;

const menuConfig = {
  frontdesk: [
    { key: '/', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/pools', icon: <FundOutlined />, label: '汤池管理' },
    { key: '/frontdesk', icon: <DesktopOutlined />, label: '前厅服务' },
    { key: '/pool-abnormal', icon: <ThunderboltOutlined />, label: '异常闭池' },
    { key: '/group-conflict', icon: <TeamOutlined />, label: '团客冲突' }
  ],
  pool_attendant: [
    { key: '/', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/pools', icon: <FundOutlined />, label: '汤池管理' },
    { key: '/patrols', icon: <EyeOutlined />, label: '巡场记录' },
    { key: '/group-conflict', icon: <TeamOutlined />, label: '接待节奏' }
  ],
  water_quality: [
    { key: '/', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/pools', icon: <FundOutlined />, label: '汤池管理' },
    { key: '/water-quality', icon: <SafetyCertificateOutlined />, label: '水质检测' },
    { key: '/pool-abnormal', icon: <ThunderboltOutlined />, label: '异常闭池' }
  ],
  engineering: [
    { key: '/', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/pools', icon: <FundOutlined />, label: '汤池管理' },
    { key: '/maintenance', icon: <ToolOutlined />, label: '设备维修' },
    { key: '/pool-abnormal', icon: <ThunderboltOutlined />, label: '异常闭池' }
  ],
  housekeeper: [
    { key: '/', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/pools', icon: <FundOutlined />, label: '汤池管理' },
    { key: '/patrols', icon: <EyeOutlined />, label: '巡场记录' },
    { key: '/pool-abnormal', icon: <ThunderboltOutlined />, label: '异常闭池' }
  ],
  customer_service: [
    { key: '/', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/pools', icon: <FundOutlined />, label: '汤池管理' },
    { key: '/complaints', icon: <WarningOutlined />, label: '客诉处理' },
    { key: '/compensations', icon: <MoneyCollectOutlined />, label: '赔付管理' },
    { key: '/group-conflict', icon: <TeamOutlined />, label: '团客冲突' }
  ],
  admin: [
    { key: '/', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/pools', icon: <FundOutlined />, label: '汤池管理' },
    { key: '/water-quality', icon: <SafetyCertificateOutlined />, label: '水质检测' },
    { key: '/maintenance', icon: <ToolOutlined />, label: '设备维修' },
    { key: '/frontdesk', icon: <DesktopOutlined />, label: '前厅服务' },
    { key: '/patrols', icon: <EyeOutlined />, label: '巡场记录' },
    { key: '/complaints', icon: <WarningOutlined />, label: '客诉处理' },
    { key: '/compensations', icon: <MoneyCollectOutlined />, label: '赔付管理' },
    { key: '/pool-abnormal', icon: <ThunderboltOutlined />, label: '异常闭池' },
    { key: '/group-conflict', icon: <TeamOutlined />, label: '团客冲突' }
  ]
};

export default function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, getRoleName } = useAuth();

  const menuItems = menuConfig[currentUser?.role] || menuConfig.admin;

  const userMenu = {
    items: [
      { key: 'role', label: `角色：${getRoleName(currentUser?.role)}`, disabled: true },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout }
    ]
  };

  return (
    <Layout className="app-layout">
      <Sider theme="dark" width={220}>
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 16,
          fontWeight: 'bold',
          background: 'rgba(255,255,255,0.05)'
        }}>
          ♨️ 温泉管理平台
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <div></div>
          <div className="app-user-info">
            <Badge count={0} size="small">
              <Button type="text" icon={<BellOutlined style={{ color: 'white' }} />} />
            </Badge>
            <Dropdown menu={userMenu} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar icon={<UserOutlined />} />
                <span>{currentUser?.name}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="app-content">{children}</Content>
      </Layout>
    </Layout>
  );
}
