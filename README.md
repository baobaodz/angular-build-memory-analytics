

# Angular 构建内存分析仪表盘 🚀

[![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Project Version](https://img.shields.io/badge/version-1.1.0-green.svg)
![ECharts Version](https://img.shields.io/badge/echarts-5.4.3-success.svg)

可视化分析 Angular 构建过程中的内存使用和耗时趋势，帮助开发者优化构建性能。

![仪表盘截图](https://github.com/baobaodz/picx-images-hosting/raw/master/memory-analytics/image.102chhotyi.webp)



![仪表盘截图](https://github.com/baobaodz/picx-images-hosting/raw/master/memory-analytics/image.1vytwy2tjh.webp)

## 核心功能 ✨

### 可视化分析维度
| **时间分析**          | **内存分析**            | **智能洞察**          |
|----------------------|-----------------------|---------------------|
| 📈 编译阶段耗时趋势    | 💾 Heap 使用峰值       | 🔍 自动识别极值点    |
| 📈 优化阶段耗时趋势    | 💾 RSS 内存峰值        | 📉 动态参考线       |
| 📈 总构建耗时趋势      | 📊 内存使用率分析       | 🔄 配置差异对比     |

### 交互特性
- **双图表联动**：同步显示时间与内存分析
- **智能提示**：悬停显示构建配置详情
- **灵活布局**：支持水平/垂直布局切换
- **数据接入**：支持文件拖拽/粘贴JSON
- **弹出模式**：支持自动/手动弹出详情面板
- **数据筛选**：支持多种时间范围筛选
- **双击交互**：手动模式下双击图表查看详情

## 快速开始 🛠️

### 环境要求
- 现代浏览器（推荐 Chrome 90+）
- Node.js 14+（仅插件开发需要）
- Angular 12+ 项目（数据采集需要）

### 在线使用
```bash
# 使用示例数据快速体验
1. 点击「下载示例文件」获取测试数据
2. 拖拽上传 build-memory-records.json 或点击选择文件
3. 悬停图表查看详细分析指标
4. 切换布局模式查看不同展示效果
5. 使用筛选器查看特定时间范围的数据
```

### 本地部署
```bash
git clone https://github.com/yourname/angular-build-memory-analytics.git
cd angular-build-memory-analytics

# 开发模式（带热更新）
npx live-server --port=3000

# 生产构建
npm run build
```

## 数据采集 📦

### 安装监控插件
```javascript
// webpack.config.js
const MemoryMonitorPlugin = require('./memory-monitor-plugin');

module.exports = {
  plugins: [
    new MemoryMonitorPlugin({
      maxRecords: 20,       // 最大记录数
    })
  ]
}
```

### 数据结构规范
```json
{
  "timestamp": "2025-03-10 16:48:01",
  "totalTime": "3min 24s",
  "status": "success",
  "buildConfigurations": {
    "optimization": true,
    "outputHashing": "all",
    "sourceMap": false,
    "namedChunks": false,
    "extractLicenses": true,
    "vendorChunk": true,
    "buildOptimizer": true
  },
  "ngCacheInfo": {
    "enabled": true,
    "environment": "all",
    "path": "E:\\work\\code\\project\\.angular\\cache",
    "sizeOnDisk": "1006.24 MB",
    "effectiveStatus": "enabled"
  },
  "deviceInfo": {
    "hostname": "DESKTOP-HEK6UKM",
    "platform": "win32",
    "osType": "Windows_NT",
    "cpuModel": "Intel(R) Core(TM) i5-6500 CPU @ 3.20GHz",
    "cpuCount": 4,
    "totalMemory": "15.89 GB",
    "freeMemory": "2.67 GB"
  },
  "data": [
    {
      "阶段": "编译",
      "阶段耗时": "21s",
      "RSS峰值 (MB)": 946,
      "Heap总峰值 (MB)": 821,
      "Heap已用峰值 (MB)": 776,
      "内存使用率峰值": "5.95%",
      "Heap使用率峰值": "94.46%"
    },
    {
      "阶段": "优化&打包",
      "阶段耗时": "1min 40s",
      "RSS峰值 (MB)": 3288,
      "Heap总峰值 (MB)": 2531,
      "Heap已用峰值 (MB)": 2467,
      "内存使用率峰值": "20.21%",
      "Heap使用率峰值": "97.44%"
    }
  ]
}
```

## 使用指南 📖

### 数据输入方式

- **文件上传**：点击或拖拽上传`JSON`文件
- **文本粘贴**：点击切换按钮，粘贴`JSON`数据到文本框

### 交互功能

- **布局切换**：点击"布局"按钮在横向/竖向布局间切换

- 弹出详情

  ：选择自动/手动模式显示详情面板

  - 自动模式：悬停图表自动显示详情
  - 手动模式：双击图表显示详情

- 数据筛选

  ：选择不同时间范围查看数据

  - 全部/最早7天/最早15天/最早10次
  - 最近7天/最近15天/最近10次

- **图表联动**：两个图表同步显示相同时间点数据

### 详情面板

- 显示构建配置信息
- 显示Angular缓存信息（如果有）
- 显示设备信息（如果有）
- 自动高亮显示配置变更



## 性能优化建议 ⚡

### 内存优化策略
```bash
# 提升Node内存限制
NODE_OPTIONS="--max-old-space-size=4096" ng build --prod

# 启用并行构建
ng build --parallel --threads=4
```

### 构建配置优化
```json
// angular.json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "cli": {
    "cache": {
      "enabled": true,
      "path": ".angular-cache",  // 缓存存储路径（可选）
      "environment": "all"       // 缓存所有环境（包括生产）
    }
  },
  "projects": {
    "your-project-name": {
      // ...其他配置
        
    }
  }
}
```

## 贡献指南 🤝

### 开发流程
1. 创建特性分支
```bash
git checkout -b feature/enhance-charts
```

2. 提交变更说明
```bash
git commit -m "feat: add 3D visualization support"
```

3. 推送并创建 Pull Request

### 代码规范
- `TypeScript 4.0+` 语法
- `ECharts 5.x` 图表规范
- `Airbnb JavaScript` 代码风格

## 许可协议 📜
本项目采用 [MIT License](LICENSE)，可自由用于商业项目。使用请保留原始署名。

---
**反馈与支持**：[创建 Issue](https://github.com/yourname/angular-build-memory-analytics/issues) | [赞助项目](https://github.com/sponsors)
