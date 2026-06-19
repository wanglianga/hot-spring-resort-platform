# 温泉度假区汤池维护与客诉处理平台

## 项目简介

本平台是面向温泉度假区的一体化管理工作台，为前厅、池区服务员、水质员、工程班、客房管家和客服等多个岗位提供统一的操作界面。平台实现了汤池开放状态、水温、矿物质补水、消毒、排污、维修、客诉、赔付和闭池记录的全流程数字化管理，确保游客体验、汤池维护和赔付处理能够精确追溯到具体池区与时段，避免事后靠对讲机回忆造成的信息丢失。

## 技术栈

- **前端**：React 18 + Vite + Ant Design 5 + React Router
- **后端**：Express.js + Node.js
- **数据库**：SQLite（better-sqlite3）
- **部署**：Docker + Docker Compose

## 功能模块

| 角色 | 功能权限 |
|------|----------|
| 前厅 | 工作台、汤池管理、前厅服务（套票入园、包池、换池） |
| 池区服务员 | 工作台、汤池管理、巡场记录 |
| 水质员 | 工作台、汤池管理、水质检测 |
| 工程班 | 工作台、汤池管理、设备维修 |
| 客房管家 | 工作台、汤池管理、巡场记录 |
| 客服 | 工作台、汤池管理、客诉处理、赔付管理 |
| 管理员 | 全部功能模块 |

### 核心功能

1. **汤池管理**：汤池信息、开放/关闭/维护状态切换、水温监控
2. **水质检测**：水温、浊度、pH值、消毒记录
3. **矿物质补水**：硫磺、玫瑰、茉莉、薰衣草、牛奶、中草药等矿物质添加记录
4. **消毒管理**：消毒剂类型、用量记录
5. **排污管理**：排污时长、排水量记录
6. **设备维修**：水泵、排污泵、加热设备、循环系统等维修工单
7. **前厅服务**：套票入园、包池服务、换池服务登记
8. **巡场记录**：游客密度、温馨提示、发现问题记录
9. **客诉处理**：投诉登记、关联汤池/监控点位、是否涉及救助、处理流程
10. **赔付管理**：赔付方案、金额、方式、审批流程

## 原始需求

> 请实现温泉度假区汤池维护与客诉处理平台，React 工作台给前厅、池区服务员、水质员、工程班、客房管家和客服使用，Express 服务保存汤池开放状态、水温、矿物质补水、消毒、排污、维修、客诉、赔付和闭池记录。前厅安排套票入园、包池和换池；池区服务员记录巡场、提醒和游客密度；水质员检测水温、浊度和消毒；工程班处理水泵、排污和加热设备；客服关联投诉、救助、监控点位和赔付方案。这个产品要让游客体验、汤池维护和赔付处理能追到具体池区与时段，不能等投诉发生后再靠对讲机回忆。

## 启动方式

### 前置要求

- Node.js ≥ 18
- npm ≥ 9 或 pnpm ≥ 8
- （可选）Docker ≥ 20.10 + Docker Compose ≥ 2.0

### 本地开发启动

#### 1. 安装依赖

```bash
cd backend && npm install
cd ../frontend && npm install
```

或在根目录执行：

```bash
cd backend && npm install && cd ../frontend && npm install
```

#### 2. 启动后端服务

```bash
cd backend
npm run dev
```

后端服务将在 `http://localhost:3001` 启动。

#### 3. 启动前端开发服务

另开一个终端：

```bash
cd frontend
npm start
```

前端服务将在 `http://localhost:3000` 启动，并自动代理 API 请求到后端。

#### 4. 访问地址

打开浏览器访问：`http://localhost:3000`

### 生产构建启动

```bash
cd frontend && npm run build
cd ../backend && npm start
```

然后访问：`http://localhost:3001`

### Docker 一键启动（推荐）

#### 前置要求

- Docker ≥ 20.10
- Docker Compose ≥ 2.0

#### 1. 构建并启动服务

```bash
docker compose up --build
```

后台运行：

```bash
docker compose up --build -d
```

#### 2. 访问地址

打开浏览器访问：`http://localhost:3001`

#### 3. 停止和清理服务

```bash
docker compose down
```

如需同时清除数据卷：

```bash
docker compose down -v
```

#### 4. 查看配置校验

```bash
docker compose config
```

## 默认测试账号

系统内置以下测试用户，直接选择身份即可登录（无需密码）：

| 用户名 | 姓名 | 角色 |
|--------|------|------|
| frontdesk | 张前厅 | 前厅 |
| pool | 李池区 | 池区服务员 |
| water | 王水质 | 水质员 |
| engineering | 赵工程 | 工程班 |
| housekeeper | 刘管家 | 客房管家 |
| customerservice | 陈客服 | 客服 |
| admin | 孙管理 | 管理员 |

## 目录结构

```
.
├── backend/                    # Express 后端服务
│   ├── routes/                 # API 路由
│   │   ├── pools.js            # 汤池管理
│   │   ├── users.js            # 用户
│   │   ├── waterQuality.js     # 水质检测
│   │   ├── minerals.js         # 矿物质补水
│   │   ├── disinfection.js     # 消毒记录
│   │   ├── drainage.js         # 排污记录
│   │   ├── maintenance.js      # 设备维修
│   │   ├── closures.js         # 闭池记录
│   │   ├── frontdesk.js        # 前厅服务
│   │   ├── patrols.js          # 巡场记录
│   │   ├── complaints.js       # 客诉处理
│   │   ├── compensations.js    # 赔付管理
│   │   └── stats.js            # 统计数据
│   ├── database.js             # SQLite 数据库初始化
│   ├── server.js               # Express 服务入口
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── api/                # API 接口封装
│   │   ├── context/            # React Context（用户认证等）
│   │   ├── components/         # 通用组件
│   │   ├── pages/              # 页面组件
│   │   │   ├── Login.jsx       # 登录页
│   │   │   ├── Dashboard.jsx   # 工作台
│   │   │   ├── Pools.jsx       # 汤池列表
│   │   │   ├── PoolDetail.jsx  # 汤池详情（全量运营记录）
│   │   │   ├── WaterQuality.jsx
│   │   │   ├── Maintenance.jsx
│   │   │   ├── FrontDesk.jsx
│   │   │   ├── Patrols.jsx
│   │   │   ├── Complaints.jsx
│   │   │   └── Compensations.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── nginx.conf              # 前端 Nginx 配置（可选）
│   ├── Dockerfile
│   └── .dockerignore
├── Dockerfile                  # 根目录统一构建入口
├── docker-compose.yml
├── .dockerignore
├── .gitignore
└── README.md
```

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/pools` | 汤池列表 |
| GET | `/api/pools/:id` | 汤池详情 |
| POST | `/api/pools` | 新增汤池 |
| PUT | `/api/pools/:id` | 更新汤池 |
| POST | `/api/pools/:id/status` | 更新汤池状态 |
| GET | `/api/pools/:id/logs` | 汤池状态日志 |
| GET | `/api/water-quality` | 水质检测记录 |
| POST | `/api/water-quality` | 记录水质检测 |
| GET | `/api/minerals` | 矿物质补水记录 |
| POST | `/api/minerals` | 记录矿物质补水 |
| GET | `/api/disinfection` | 消毒记录 |
| POST | `/api/disinfection` | 记录消毒 |
| GET | `/api/drainage` | 排污记录 |
| POST | `/api/drainage` | 记录排污 |
| GET | `/api/maintenance` | 维修工单列表 |
| POST | `/api/maintenance` | 创建维修工单 |
| PUT | `/api/maintenance/:id` | 更新维修工单 |
| GET | `/api/closures` | 闭池记录 |
| POST | `/api/closures` | 申请闭池 |
| POST | `/api/closures/:id/reopen` | 重开汤池 |
| GET | `/api/frontdesk` | 前厅服务记录 |
| POST | `/api/frontdesk` | 登记前厅服务 |
| GET | `/api/patrols` | 巡场记录 |
| POST | `/api/patrols` | 记录巡场 |
| GET | `/api/complaints` | 客诉列表 |
| GET | `/api/complaints/:id` | 客诉详情（含赔付） |
| POST | `/api/complaints` | 登记客诉 |
| PUT | `/api/complaints/:id` | 更新客诉状态 |
| GET | `/api/compensations` | 赔付记录列表 |
| POST | `/api/compensations` | 创建赔付方案 |
| PUT | `/api/compensations/:id` | 更新赔付审批 |
| GET | `/api/stats/overview` | 工作台统计概览 |
| GET | `/api/stats/pool/:poolId` | 汤池全量运营记录 |
| GET | `/api/pool-abnormal-reports` | 异常报告列表 |
| GET | `/api/pool-abnormal-reports/:id` | 异常报告详情（含决策、通知、复测） |
| POST | `/api/pool-abnormal-reports` | 提交异常报告 |
| PUT | `/api/pool-abnormal-reports/:id/status` | 更新异常报告状态 |
| GET | `/api/pool-abnormal-decisions` | 异常决策列表 |
| POST | `/api/pool-abnormal-decisions` | 提交处理决策（自动更新汤池状态） |
| GET | `/api/guest-notifications` | 客人通知列表 |
| POST | `/api/guest-notifications` | 发送客人通知 |
| GET | `/api/retest-records` | 复测记录列表 |
| POST | `/api/retest-records` | 提交复测记录（通过则自动重开汤池） |
| GET | `/api/group-conflicts` | 团客冲突列表 |
| GET | `/api/group-conflicts/:id` | 团客冲突详情（含调整方案） |
| POST | `/api/group-conflicts` | 登记团客冲突 |
| PUT | `/api/group-conflicts/:id/status` | 更新冲突状态 |
| PUT | `/api/group-conflicts/:id/arrival` | 登记实际到达时间 |
| GET | `/api/conflict-adjustments` | 冲突调整方案列表 |
| POST | `/api/conflict-adjustments` | 提交调整方案 |
| GET | `/api/preventive-maintenance/plans` | 预防性维护计划列表 |
| POST | `/api/preventive-maintenance/plans` | 创建维护计划 |
| PUT | `/api/preventive-maintenance/plans/:id` | 更新维护计划 |
| DELETE | `/api/preventive-maintenance/plans/:id` | 停用维护计划 |
| GET | `/api/preventive-maintenance/executions` | 维护执行记录列表 |
| POST | `/api/preventive-maintenance/executions` | 创建执行记录 |
| PUT | `/api/preventive-maintenance/executions/:id/start` | 开始执行（记录维护前读数） |
| PUT | `/api/preventive-maintenance/executions/:id/complete` | 完成执行（记录维护后读数，异常自动闭池） |
| GET | `/api/preventive-maintenance/reminders` | 维护提醒列表 |
| PUT | `/api/preventive-maintenance/reminders/:id/read` | 标记提醒已读 |
| GET | `/api/preventive-maintenance/health-profiles` | 健康档案列表 |
| GET | `/api/preventive-maintenance/health-profiles/:poolId` | 汤池健康档案详情 |
| POST | `/api/preventive-maintenance/health-profiles/:poolId/deep-maintenance` | 记录深度保养 |
| POST | `/api/preventive-maintenance/generate-reminders` | 生成维护提醒 |
| GET | `/api/preventive-maintenance/dashboard-alerts` | 工作台预警数据 |

## 数据持久化

SQLite 数据库文件存储在 `backend/data/hotspring.db`，Docker 环境下通过 volume 持久化。

## 注意事项

1. 本系统为演示版本，登录采用用户名直接选择方式，未使用密码验证，生产环境需补充完整的认证机制。
2. 默认预置了 10 个汤池和 7 个测试用户，首次启动时自动初始化。
3. 所有操作记录均关联操作人和时间戳，可精确追溯具体池区与时段。
