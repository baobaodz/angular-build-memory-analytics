// 初始化图表实例
let timeChart, memoryChart;
let isHorizontalLayout = true;
let buildConfigVisible = false;
// 添加显示构建配置的函数
let rawDataCache = null;

// 页面加载初始化
window.onload = function () {
  timeChart = echarts.init(document.getElementById("timeChart"));
  memoryChart = echarts.init(document.getElementById("memoryChart"));
  // 连接图表实现联动
  echarts.connect([timeChart, memoryChart]);

  // 绑定事件（新增联动事件）
  bindChartEvents();
  // 绑定文件选择事件
  const fileInput = document.getElementById("fileInput");
  fileInput.addEventListener("change", handleFileSelect);

  bindDropZoneEvents();

  // 添加筛选器事件监听
  bindFilterEvents();
};
function bindDropZoneEvents() {
  // 添加拖拽上传功能
  const dropZone = document.getElementById('dropZone');

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect({ target: { files: [file] } });
    }
  });
}
function bindFilterEvents() {
  document.querySelectorAll('.filter-item').forEach(item => {
    item.addEventListener('click', function () {
      // 移除其他项的active类
      document.querySelectorAll('.filter-item').forEach(i => i.classList.remove('active'));
      // 添加当前项的active类
      this.classList.add('active');

      if (!rawDataCache) return;

      const filteredData = filterData(rawDataCache, this.dataset.value);
      const processedData = processData(filteredData);
      renderCharts(processedData);
    });
  });
}
function filterData(data, filterType) {
  if (filterType === 'all') return data;

  const now = new Date();
  let filteredData;

  switch (filterType) {
    case 'first7days':
      const firstDate = new Date(data[0].timestamp);
      filteredData = data.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return (entryDate - firstDate) <= 7 * 24 * 60 * 60 * 1000;
      });
      break;
    case 'first15days':
      const firstDate15 = new Date(data[0].timestamp);
      filteredData = data.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return (entryDate - firstDate15) <= 15 * 24 * 60 * 60 * 1000;
      });
      break;
    case 'first10times':
      filteredData = data.slice(0, 10);
      break;
    case 'last7days':
      filteredData = data.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return (now - entryDate) <= 7 * 24 * 60 * 60 * 1000;
      });
      break;
    case 'last15days':
      filteredData = data.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return (now - entryDate) <= 15 * 24 * 60 * 60 * 1000;
      });
      break;
    case 'last10times':
      filteredData = data.slice(-10);
      break;
    default:
      return data;
  }

  return filteredData;
}
function toggleFullscreen() {
  const textarea = document.getElementById('jsonInput');
  const fullscreenBtn = document.querySelector('.fullscreen-btn');

  if (!textarea.classList.contains('textarea-fullscreen')) {
    textarea.classList.add('textarea-fullscreen');
    fullscreenBtn.classList.add('active');
    // 自动聚焦
    textarea.focus();
  } else {
    textarea.classList.remove('textarea-fullscreen');
    fullscreenBtn.classList.remove('active');
  }
}

// 添加ESC键退出全屏
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const textarea = document.getElementById('jsonInput');
    if (textarea.classList.contains('textarea-fullscreen')) {
      toggleFullscreen();
    }
  }
});
// 修改后的文件处理函数
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 显示文件名
  const fileNameElement = document.getElementById('fileName');
  fileNameElement.style.display = 'block';
  fileNameElement.textContent = file.name;

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      let content = e.target.result;
      // 先处理所有的空白字符
      content = content.trim();
      // 使用\s*处理空格和换行，同时确保中间不包含]或[
      content = content.replace(/\]\s*((?!.*[\[\]])[\s\S])*?\s*\[/g, ",");
      if (!content) {
        showError("文件内容为空");
        return;
      };
      // 显示筛选器
      document.getElementById('filterContainer').style.display = 'flex';

      const rawData = JSON.parse(content);
      // 缓存原始数据
      rawDataCache = rawData;

      const processedData = processData(rawData);
      renderCharts(processedData);
    } catch (error) {
      showError("文件处理失败: " + error.message);
    }
  };

  reader.readAsText(file);
}
// 图表联动事件绑定
function bindChartEvents() {
  // 耗时图表悬浮事件
  timeChart.on("mouseover", function (params) {
    memoryChart.dispatchAction({
      type: "showTip",
      seriesIndex: params.seriesIndex,
      dataIndex: params.dataIndex,
    });
  });

  // 内存图表悬浮事件
  memoryChart.on("mouseover", function (params) {
    timeChart.dispatchAction({
      type: "showTip",
      seriesIndex: params.seriesIndex,
      dataIndex: params.dataIndex,
    });
  });
  // 添加鼠标移出事件
  timeChart.on("globalout", hideConfigTip);
  memoryChart.on("globalout", hideConfigTip);
}
function hideConfigTip() {
  const tipContainer = document.getElementById('hoverConfigTip');
  tipContainer.classList.remove('active');
  lastConfig = null;
}
// 布局切换
function toggleLayout() {
  const chartContainer = document.getElementById("chartContainer");
  const mainContainer = document.getElementById("mainContainer");
  const configTip = document.getElementById("hoverConfigTip");
  isHorizontalLayout = !isHorizontalLayout;
  chartContainer.className = isHorizontalLayout
    ? "horizontal-layout"
    : "vertical-layout";
  mainContainer.style.maxWidth = isHorizontalLayout ? "100%" : "1400px";

  // 移动配置提示到合适的位置
  if (!isHorizontalLayout) {
    chartContainer.insertBefore(configTip, chartContainer.firstChild);
  } else {
    chartContainer.appendChild(configTip);
  }
  setTimeout(() => {
    timeChart.resize();
    memoryChart.resize();
  }, 300);
}
// 切换输入模式
function switchInputMode() {
  const fileArea = document.getElementById('fileInputArea');
  const textArea = document.getElementById('textInputArea');
  const switchBtn = document.querySelector('.switch-btn');
  const analyzeBtn = document.querySelector('.analyze-btn');

  // 添加旋转动画
  switchBtn.classList.add('rotate');

  // 添加淡出动画
  if (fileArea.style.display !== 'none') {
    fileArea.classList.add('fade-out');
    setTimeout(() => {
      fileArea.style.display = 'none';
      textArea.style.display = 'flex';
      // 添加淡入动画
      setTimeout(() => {
        textArea.classList.add('fade-in');
        analyzeBtn.style.display = 'block';
      }, 50);
    }, 300);
  } else {
    textArea.classList.add('fade-out');
    analyzeBtn.style.display = 'none';
    setTimeout(() => {
      textArea.style.display = 'none';
      fileArea.style.display = 'flex';
      // 添加淡入动画
      setTimeout(() => fileArea.classList.add('fade-in'), 50);
    }, 300);
  }

  // 重置动画类
  setTimeout(() => {
    switchBtn.classList.remove('rotate');
    fileArea.classList.remove('fade-out', 'fade-in');
    textArea.classList.remove('fade-out', 'fade-in');
  }, 300);
}


// 分析输入框数据
function analyzeInputData() {
  const jsonInput = document.getElementById('jsonInput');
  const content = jsonInput.value.trim();

  try {
    // 处理空格和换行
    const cleanContent = content.replace(/\]\s*((?!.*[\[\]])[\s\S])*?\s*\[/g, ",");
    if (!cleanContent) {
      showError("输入数据为空");
      return;
    };
    // 显示筛选器
    document.getElementById('filterContainer').style.display = 'flex';
    const rawData = JSON.parse(cleanContent);
    rawDataCache = rawData;

    const processedData = processData(rawData);
    renderCharts(processedData);
  } catch (error) {
    showError("数据解析失败: " + error.message);
  }
}
// 修改后的图表渲染函数
function renderCharts(processedData) {
  const timeOption = createTimeOption(processedData);
  const memoryOption = createMemoryOption(processedData);
  timeChart.setOption(timeOption);
  memoryChart.setOption(memoryOption);
}

// 添加节流函数
function throttle(fn, delay) {
  let timer = null;
  let lastTime = 0;

  return function (...args) {
    const now = Date.now();

    if (now - lastTime >= delay) {
      fn.apply(this, args);
      lastTime = now;
    } else {
      clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(this, args);
        lastTime = now;
      }, delay);
    }
  };
}
// 添加防抖函数
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// 使用防抖包装 showBuildConfig
const debouncedShowBuildConfig = debounce(showBuildConfig, 100);
function createTimeOption(data) {
  // 预处理：计算各系列极值索引
  const compileTime = data.compileTime;
  const compileMaxIndex = compileTime.indexOf(Math.max(...compileTime));
  const compileMinIndex = compileTime.indexOf(Math.min(...compileTime));

  const optimizeTime = data.optimizeTime;
  const optimizeTimeMaxIndex = optimizeTime.indexOf(Math.max(...optimizeTime));
  const optimizeTimeMinIndex = optimizeTime.indexOf(Math.min(...optimizeTime));

  const totalTime = data.totalTime;
  const totalTimeMaxIndex = totalTime.indexOf(Math.max(...totalTime));
  const totalTimeMinIndex = totalTime.indexOf(Math.min(...totalTime));

  return {
    title: {
      text: "构建阶段耗时趋势分析",
      left: "center",
    },
    legend: {
      top: 30,
      textStyle: {
        fontSize: 12,
      },
      itemGap: 20,
    },
    xAxis: {
      type: "category",
      data: data.time,
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: "value",
      name: "耗时 (秒)",
    },
    series: [
      {
        name: "编译阶段",
        type: "line",
        data: compileTime,
        symbol: "circle",
        symbolSize: 8,
        itemStyle: {
          color: "#5470C6",
        },
        label: {
          show: true,
          position: "top",
          color: "#5470C6",
          fontSize: 12,
          formatter: function (params) {
            // 动态判断是否为极值点
            if (
              params.dataIndex === compileMaxIndex ||
              params.dataIndex === compileMinIndex
            ) {
              return ""; // 极值点不显示系列标签
            }
            return `${params.value}s`;
          },
        },
        markPoint: {
          data: [
            {
              type: "max",
              name: "Max",
              label: {
                show: true,
                formatter: function (params) {
                  return formatTimeSeconds(params.value);
                },
              },
            },
            {
              type: "min",
              name: "Min",
              label: {
                show: true,
                formatter: function (params) {
                  return formatTimeSeconds(params.value);
                },
              },
            },
          ],
        },
        markLine: {
          data: [
            {
              type: "average",
              name: "Avg",
              label: {
                show: true,
                formatter: function (params) {
                  return formatTimeSeconds(params.value);
                },
              },
            },
          ],
        },
      },
      {
        name: "优化&打包阶段",
        type: "line",
        data: optimizeTime,
        symbol: "rect",
        symbolSize: 8,
        itemStyle: {
          color: "#EE6666",
        },
        label: {
          show: true,
          position: "bottom",
          color: "#EE6666",
          fontSize: 12,
          formatter: function (params) {
            // 动态判断是否为极值点
            if (
              params.dataIndex === optimizeTimeMaxIndex ||
              params.dataIndex === optimizeTimeMinIndex
            ) {
              return ""; // 极值点不显示系列标签
            }
            return `${params.value}s`;
          },
        },
        markPoint: {
          data: [
            {
              type: "max",
              name: "Max",
              label: {
                show: true,
                formatter: function (params) {
                  return formatTimeSeconds(params.value);
                },
              },
            },
            {
              type: "min",
              name: "Min",
              label: {
                show: true,
                formatter: function (params) {
                  return formatTimeSeconds(params.value);
                },
              },
            },
          ],
        },
        markLine: {
          data: [
            {
              type: "average",
              name: "Avg",
              label: {
                show: true,
                formatter: function (params) {
                  return formatTimeSeconds(params.value);
                },
              },
            },
          ],
        },
      },
      {
        name: "总耗时",
        type: "line",
        data: totalTime,
        symbol: "triangle",
        symbolSize: 10,
        itemStyle: {
          color: "#73C0DE",
        },
        lineStyle: {
          type: "dotted",
          width: 2,
        },
        label: {
          show: true,
          position: "top",
          color: "#73C0DE",
          fontSize: 12,
          formatter: function (params) {
            // 动态判断是否为极值点
            if (
              params.dataIndex === totalTimeMaxIndex ||
              params.dataIndex === totalTimeMinIndex
            ) {
              return ""; // 极值点不显示系列标签
            }
            return `${params.value}s`;
          },
        },
        markPoint: {
          data: [
            {
              type: "max",
              name: "Max",
              label: {
                show: true,
                formatter: function (params) {
                  return formatTimeSeconds(params.value);
                },
              },
            },
            {
              type: "min",
              name: "Min",
              label: {
                show: true,
                formatter: function (params) {
                  return formatTimeSeconds(params.value);
                },
              },
            },
          ],
        },
        markLine: {
          data: [
            {
              type: "average",
              name: "Avg",
              label: {
                show: true,
                formatter: function (params) {
                  return formatTimeSeconds(params.value);
                },
              },
            },
          ],
        },
      },
    ],
    grid: {
      bottom: "18%",
    },
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const time = params[0].axisValue;
        debouncedShowBuildConfig(time);
        let tooltipContent = `${time}<br>`;
        params.forEach((p) => {
          // 使用新的时间格式化函数
          const timeValue = formatTimeSeconds(p.value);
          tooltipContent += `${p.marker} ${p.seriesName}: ${timeValue}<br>`;
        });
        return tooltipContent;
      },
    },
  };
}

function createMemoryOption(data) {
  const compileHeap = data.compileHeap;
  const compileHeapMaxIndex = compileHeap.indexOf(Math.max(...compileHeap));
  const compileHeapMinIndex = compileHeap.indexOf(Math.min(...compileHeap));

  const optimizeHeap = data.optimizeHeap;
  const optimizeHeapMaxIndex = optimizeHeap.indexOf(Math.max(...optimizeHeap));
  const optimizeHeapMinIndex = optimizeHeap.indexOf(Math.min(...optimizeHeap));

  return {
    title: {
      text: "构建阶段内存使用分析",
      left: "center",
    },
    legend: {
      top: 30,
      orient: "horizontal",
      textStyle: {
        fontSize: 12,
      },
      itemWidth: 25,
      itemHeight: 14,
    },
    xAxis: {
      type: "category",
      data: data.time,
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: "value",
      name: "Heap内存使用 (MB)",
    },
    series: [
      {
        name: "编译Heap峰值",
        type: "bar",
        data: compileHeap,
        itemStyle: {
          color: "#91CC75",
        },
        label: {
          // 新增数值标签
          show: true,
          position: "top",
          color: "#91CC75",
          fontSize: 12,
          formatter: function (params) {
            // 动态判断是否为极值点
            if (
              params.dataIndex === compileHeapMaxIndex ||
              params.dataIndex === compileHeapMinIndex
            ) {
              return ""; // 极值点不显示系列标签
            }
            return `${params.value}MB`;
          },

        },
        markPoint: {
          data: [
            {
              type: "max",
              name: "Max",
              label: {
                show: true,
                formatter: function (params) {
                  return (params.value / 1024).toFixed(2) + "G";
                },
              },
            },
            {
              type: "min",
              name: "Min",
              label: {
                show: true,
                formatter: function (params) {
                  return (params.value / 1024).toFixed(2) + "G";
                },
              },
            },
          ],
        },
        markLine: {
          data: [
            {
              type: "average",
              name: "Avg",
              label: {
                show: true,
                formatter: function (params) {
                  return (params.value / 1024).toFixed(2) + "G";
                },
              },
            },
          ],
        },
      },
      {
        name: "优化&打包Heap峰值",
        type: "bar",
        data: optimizeHeap,
        itemStyle: {
          color: "#FAC858",
        },
        label: {
          show: true,
          position: "top",
          color: "#FAC858",
          fontSize: 12,
          formatter: function (params) {
            // 动态判断是否为极值点
            if (
              params.dataIndex === optimizeHeapMaxIndex ||
              params.dataIndex === optimizeHeapMinIndex
            ) {
              return ""; // 极值点不显示系列标签
            }
            return `${params.value}MB`;
          },
        },
        markPoint: {
          data: [
            {
              type: "max",
              name: "Max",
              label: {
                show: true,
                formatter: function (params) {
                  return (params.value / 1024).toFixed(2) + "G";
                },
              },
            },
            {
              type: "min",
              name: "Min",
              label: {
                show: true,
                formatter: function (params) {
                  return (params.value / 1024).toFixed(2) + "G";
                },
              },
            },
          ],
        },
        markLine: {
          data: [
            {
              type: "average",
              name: "Avg",
              label: {
                show: true,
                formatter: function (params) {
                  return (params.value / 1024).toFixed(2) + "G";
                },
              },
            },
            // 添加Node堆内存限制线
            {
              name: "Node默认堆内存限制",
              yAxis: 1433.6,
              lineStyle: {
                color: "#ff0000",
                type: "dashed",
                width: 2,
              },
              label: {
                formatter: "Node默认堆内存限制: 1.4G",
                position: "insideEndTop",
              },
            },
          ],
        },
      },
    ],
    grid: {
      bottom: "18%",
    },
    tooltip: {
      trigger: "axis",
      formatter: function (params) {
        const time = params[0].axisValue;
        debouncedShowBuildConfig(time);

        let tooltipContent = `${time}<br>`;
        params.forEach((p) => {
          tooltipContent += `${p.marker} ${p.seriesName}: ${p.value}<br>`;
        });
        return tooltipContent;
      },
    },
  };
}
// 数据预处理（保持原有逻辑）
function processData(data) {
  const result = {
    time: [],
    compileTime: [],
    optimizeTime: [],
    totalTime: [],
    compileHeap: [],
    optimizeHeap: [],
  };

  data.forEach((entry) => {
    // 时区转换处理
    const rawTime = new Date(entry.timestamp);

    // 格式化为 "MM-DD HH:mm"
    const timeStr = formatTime(rawTime);
    // 提取总耗时（新增）
    if (entry.totalTime) {
      result.totalTime.push(convertToSeconds(entry.totalTime));
    }

    // 提取数据
    entry.data.forEach((stage) => {
      if (stage.阶段 === "编译") {
        result.time.push(timeStr);
        result.compileTime.push(convertToSeconds(stage.阶段耗时));
        result.compileHeap.push(stage["Heap已用峰值 (MB)"]);
      } else if (stage.阶段 === "优化&打包") {
        result.optimizeTime.push(convertToSeconds(stage.阶段耗时));
        result.optimizeHeap.push(stage["Heap已用峰值 (MB)"]);
      }
    });
  });

  return result;
}

function formatTimeSeconds(seconds) {
  // 先对输入值取整
  seconds = Math.round(seconds);
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs
      ? `${mins}min ${secs.toString().padStart(2, "0")}s`
      : `${mins}min`;
  }
  return `${seconds}s`;
}

function convertToSeconds(timeStr) {
  // 同时匹配以下格式：
  // 1. "Xmin Ys" (如 "2min 30s")
  // 2. "Xmin" (如 "2min")
  // 3. "Xs" (如 "45s")
  const timePattern = /(\d+)min\s*(\d+)?s?/i;
  const match = timeStr.match(timePattern);

  if (match) {
    const minutes = parseInt(match[1], 10);
    const seconds = match[2] ? parseInt(match[2], 10) : 0; // 处理无秒数情况
    return minutes * 60 + seconds;
  } else if (timeStr.includes("s")) {
    // 处理纯秒数格式 (如 "45s")
    return parseInt(timeStr.replace("s", ""), 10);
  }

  // 如果都不匹配返回0或抛出错误
  console.warn(`无法解析时间格式: ${timeStr}`);
  return 0; // 或 throw new Error(`Invalid time format: ${timeStr}`);
}

function formatTime(date) {
  return (
    [date.getMonth() + 1, date.getDate()].join("-") +
    " " +
    [
      date.getHours().toString().padStart(2, "0"),
      date.getMinutes().toString().padStart(2, "0"),
    ].join(":")
  );
}

// 错误提示函数
function showError(message) {
  alert(message);
  console.error(message);
}
// 窗口自适应
window.addEventListener("resize", () => {
  timeChart.resize();
  memoryChart.resize();
});
// 文件下载功能
function downloadSampleFile() {
  // 创建虚拟链接
  const link = document.createElement("a");
  link.href = "./example-file/build-memory-records.json";
  link.download = "build-memory-records.json";

  // 兼容处理
  if (typeof MouseEvent === "function") {
    const event = new MouseEvent("click", {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    link.dispatchEvent(event);
  } else {
    // 旧版浏览器兼容
    const event = document.createEvent("MouseEvents");
    event.initEvent("click", true, true);
    link.dispatchEvent(event);
  }
}


let lastConfig = null;

function showBuildConfig(time) {
  const tipContainer = document.getElementById("hoverConfigTip");

  if (!rawDataCache) return;

  const matchedData = rawDataCache.find((entry) => {
    const rawTime = new Date(entry.timestamp);
    const entryTime = formatTime(rawTime);
    return entryTime === time;
  });

  if (matchedData) {
    const currentConfig = matchedData.buildConfigurations || {};
    const ngCacheInfo = matchedData.ngCacheInfo || {};
    const deviceInfo = matchedData.deviceInfo || {};

    tipContainer.innerHTML = `
        <div class="config-group">
            <div class="config-subtitle">构建时间: ${time}</div>
            ${renderConfigItemsWithDiff(currentConfig, lastConfig ? lastConfig.config : null)}
        </div>
        ${ngCacheInfo && Object.keys(ngCacheInfo).length > 0 ? `
        <div class="config-group">
            <div class="config-subtitle">Angular 缓存信息</div>
            ${renderConfigItemsWithDiff(ngCacheInfo, lastConfig ? lastConfig.cache : null)}
        </div>
        ` : ''}
        ${deviceInfo && Object.keys(deviceInfo).length > 0 ? `
        <div class="config-group">
            <div class="config-subtitle">设备信息</div>
            ${renderConfigItemsWithDiff(deviceInfo, lastConfig ? lastConfig.device : null)}
        </div>
        ` : ''}
      `;
    tipContainer.classList.add("active");

    // 保存上一次的配置以便比较变化
    lastConfig = {
      config: currentConfig,
      cache: ngCacheInfo,
      device: deviceInfo
    };
  } else {
    tipContainer.classList.remove("active");
  }
}
function renderConfigItemsWithDiff(currentConfig, lastConfig) {
  if (!currentConfig || Object.keys(currentConfig).length === 0) {
    return '<div class="config-items">无数据</div>';
  }
  // 定义哪些字段和值应该使用布尔样式
  const booleanLikeFields = {
    'effectiveStatus': {
      trueValues: ['enabled', 'active', 'on'],
      falseValues: ['disabled', 'inactive', 'off']
    }
  }
  return `<div class="config-items">
      ${Object.entries(currentConfig)
      .map(([key, value]) => {
        const changed = lastConfig && JSON.stringify(lastConfig[key]) !== JSON.stringify(value);
        let valueClass = '';
        if (typeof value === 'boolean') {
          valueClass = `config-value-${value}`;
        } else if (booleanLikeFields[key]) {
          // 检查是否为类布尔字段
          const fieldConfig = booleanLikeFields[key];
          if (fieldConfig.trueValues.includes(value.toString().toLowerCase())) {
            valueClass = 'config-value-true';
          } else if (fieldConfig.falseValues.includes(value.toString().toLowerCase())) {
            valueClass = 'config-value-false';
          }
        }

        return `
            <span class="config-item ${changed ? "config-changed" : ""}" data-key="${key}">
              ${key}: <span class="${valueClass}">${value}</span>
            </span>
          `;
      })
      .join("")}
    </div>`;
}
