基于你的项目需求，以下是完善后的README.md内容：

# Angular Build Memory Analytics 🚀

[![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Project Version](https://img.shields.io/badge/version-1.0.0-green.svg)

可视化分析Angular构建过程中的内存使用情况和耗时趋势，帮助开发者优化构建性能。

![Demo Screenshot](./screenshot.png) <!-- 建议添加实际截图 -->

## 主要特性 ✨

- **双维度可视化分析**
  - 📈 构建耗时趋势分析（编译/优化/总耗时）
  - 💾 内存使用峰值分析（`Heap/RSS`）
- **智能数据洞察**
  - 🔍 自动识别极值点（最大/最小值）
  - 📉 显示平均值参考线
- **交互功能**
  - 🖱 图表联动交互
  - 🔄 一键切换布局模式（水平/垂直）
  - 📥 支持`JSON`数据文件上传
  - ⬇️ 提供示例数据下载

## 快速开始 🚀

### 在线使用
1. 访问[在线演示](https://your-demo-url.com)
2. 点击"下载示例文件"获取测试数据
3. 选择并上传`JSON`文件

### 本地运行
```bash
git clone https://github.com/yourusername/angular-build-memory-analytics.git
cd angular-build-memory-analytics
# 使用Live Server等本地服务器打开index.html
```

## 数据格式规范 📄
示例数据结构：
```json
[
  {
    "timestamp": "2025-03-06 09:12:01",
    "totalTime": "2min 26s",
    "status": "success",
    "data": [
      {
        "阶段": "编译",
        "阶段耗时": "21s",
        "RSS峰值 (MB)": 934,
        "Heap总峰值 (MB)": 812,
        "Heap已用峰值 (MB)": 771,
        "内存使用率峰值": "5.88%",
        "Heap使用率峰值": "94.89%"
      },
      {
        "阶段": "优化&打包",
        "阶段耗时": "2min 3s",
        "RSS峰值 (MB)": 5612,
        "Heap总峰值 (MB)": 5397,
        "Heap已用峰值 (MB)": 5252,
        "内存使用率峰值": "35.33%",
        "Heap使用率峰值": "97.33%"
      }
    ]
  }
]
```

## 开发指南 🛠️

### 项目结构
```
├── build-memory-records.json    # 示例数据
├── index.html                  # 主界面
├── index.js                    # 核心逻辑
├── index.css                   # 样式表
└── README.md                   # 说明文档
```

### 构建分析维度
| 指标类型       | 包含参数                      |
|----------------|-----------------------------|
| **时间指标**   | 编译耗时、优化耗时、总耗时    |
| **内存指标**   | Heap使用峰值、RSS内存峰值     |
| **使用率指标** | 内存使用率、Heap使用率        |

## 贡献指南 🤝
欢迎通过Issue或PR参与贡献，建议流程：
1. Fork项目仓库
2. 创建特性分支 (`git checkout -b feature/your-feature`)
3. 提交更改 (`git commit -m 'Add some feature'`)
4. 推送到分支 (`git push origin feature/your-feature`)
5. 创建Pull Request

## 性能优化建议 💡
1. 当Heap使用持续超过`1.4GB`时：
   ```bash
   # 增加Node内存限制
   node --max-old-space-size=4096 your-build-script.js
   ```
2. 优化构建配置：
   ```typescript
   // angular.json
   "configurations": {
     "production": {
       "optimization": true,
       "aot": true,
       "buildOptimizer": true
     }
   }
   ```

## 许可证 📜
本项目采用 [MIT License](LICENSE)
