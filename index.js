// 初始化图表实例
let timeChart, memoryChart;
let isHorizontalLayout = true;
let buildConfigVisible = false;
// 添加显示构建配置的函数
let rawDataCache = null;
let sideInfoPanelVisible = false;
let hoverTimeout;
let autoPopupEnabled = true; // 默认开启自动弹出

// 切换弹出模式的函数
function togglePopupMode() {
  autoPopupEnabled = !autoPopupEnabled;
  updatePopupModeButton();
}

// 更新按钮显示
function updatePopupModeButton() {
  const modeSpan = document.querySelector('.popup-mode');
  if (autoPopupEnabled) {
    modeSpan.textContent = '自动';
    modeSpan.className = 'popup-mode auto';
  } else {
    modeSpan.textContent = '手动';
    modeSpan.className = 'popup-mode manual';
  }
}

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
  // 设置侧边面板事件
  setupSidePanelEvents();
  // 初始化布局模式按钮
  updateLayoutModeButton();
  // 初始化弹出模式按钮
  updatePopupModeButton();

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

      const filterResult = filterData(rawDataCache, this.dataset.value);
      const processedData = processData(filterResult.data);
      // 渲染图表并处理空数据情况
      renderCharts(processedData, filterResult.isEmpty);
    });
  });
}
function filterData(data, filterType) {
  if (filterType === 'all') return { data: data, isEmpty: false };
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
      return { data: data, isEmpty: false };
  }

  return { data: filteredData, isEmpty: filteredData.length === 0 };
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
      renderCharts(processedData, false);
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
  // 添加双击事件
  timeChart.on("dblclick", function (params) {
    console.log('🚀 -> params:', params);
    if (!autoPopupEnabled) {
      showSidePanel();
    }
  });

  memoryChart.on("dblclick", function (params) {
    if (!autoPopupEnabled) {
      showSidePanel();
    }
  });
  // 添加全局点击事件 - 针对整个图表区域
  document.getElementById('timeChart').addEventListener('dblclick', function (e) {
    if (!autoPopupEnabled && isTooltipVisible(timeChart)) {
      showSidePanel();
    }
  });

  document.getElementById('memoryChart').addEventListener('dblclick', function (e) {
    if (!autoPopupEnabled && isTooltipVisible(timeChart)) {
      showSidePanel();
    }
  });
  // 添加鼠标移出事件
  timeChart.on("globalout", hideConfigTip);
  memoryChart.on("globalout", hideConfigTip);

}
// 添加检测tooltip是否显示的函数
function isTooltipVisible(chart) {
  try {
    // 获取当前tooltip的显示状态
    return chart.getOption().tooltip[0].show;
  } catch (e) {
    return false;
  }
}
function hideConfigTip() {
  // 设置延迟，避免鼠标在图表和面板之间移动时面板闪烁
  hoverTimeout = setTimeout(() => {
    // 只有当鼠标不在侧边面板上时才隐藏
    if (!isMouseOverSidePanel()) {
      hideSidePanel();
    }
  }, 300);
}
// 检查鼠标是否在侧边面板上
function isMouseOverSidePanel() {
  const sidePanel = document.getElementById("sideInfoPanel");
  return sidePanel.matches(':hover');
}

// 为侧边面板添加鼠标事件
function setupSidePanelEvents() {
  const sidePanel = document.getElementById("sideInfoPanel");

  // 鼠标进入面板时取消隐藏计时器
  sidePanel.addEventListener('mouseenter', () => {
    clearTimeout(hoverTimeout);
  });

  // 鼠标离开面板时启动隐藏计时器
  sidePanel.addEventListener('mouseleave', () => {
    hideConfigTip();
  });
}
// 布局切换
function toggleLayout() {
  isHorizontalLayout = !isHorizontalLayout;
  updateLayoutDisplay();

  // 更新布局模式按钮显示
  updateLayoutModeButton();

  setTimeout(() => {
    timeChart.resize();
    memoryChart.resize();
  }, 300);
}
// 更新布局显示
function updateLayoutDisplay() {
  const chartContainer = document.getElementById("chartContainer");
  const mainContainer = document.getElementById("mainContainer");

  chartContainer.className = isHorizontalLayout
    ? "horizontal-layout"
    : "vertical-layout";
  mainContainer.style.maxWidth = isHorizontalLayout ? "100%" : "1400px";
}
function updateLayoutModeButton() {
  const modeSpan = document.querySelector('.layout-mode');
  if (isHorizontalLayout) {
    modeSpan.textContent = '横向';
    modeSpan.className = 'layout-mode horizontal';
  } else {
    modeSpan.textContent = '竖向';
    modeSpan.className = 'layout-mode vertical';
  }
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
    renderCharts(processedData, false);
  } catch (error) {
    showError("数据解析失败: " + error.message);
  }
}
// 修改后的图表渲染函数
function renderCharts(processedData, isEmpty = false) {
  const timeOption = createTimeOption(processedData);
  const memoryOption = createMemoryOption(processedData);

  // 设置图表选项
  timeChart.setOption(timeOption);
  memoryChart.setOption(memoryOption);

  // 如果数据为空，添加无数据图标
  if (isEmpty) {
    // 为时间图表添加无数据图标
    timeChart.setOption({
      ...timeOption,
      graphic: [
        {
          type: 'group',
          left: 'center',
          top: 'middle',
          children: [
            {
              type: 'image',
              z: 100,
              style: {
                image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2NjY2NjYyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48bGluZSB4MT0iNC45MyIgeTE9IjQuOTMiIHgyPSIxOS4wNyIgeTI9IjE5LjA3Ij48L2xpbmU+PC9zdmc+',
                width: 80,
                height: 80,
                opacity: 0.8
              }
            },
            {
              type: 'text',
              z: 100,
              top: 85,
              left: 'center',
              style: {
                fill: '#999',
                text: '没有符合条件的数据',
                font: '14px Microsoft YaHei'
              }
            }
          ]
        }
      ]
    }, true);

    // 为内存图表添加无数据图标
    memoryChart.setOption({
      ...memoryOption,
      graphic: [
        {
          type: 'group',
          left: 'center',
          top: 'middle',
          children: [
            {
              type: 'image',
              z: 100,
              style: {
                image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2NjY2NjYyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48bGluZSB4MT0iNC45MyIgeTE9IjQuOTMiIHgyPSIxOS4wNyIgeTI9IjE5LjA3Ij48L2xpbmU+PC9zdmc+',
                width: 80,
                height: 80,
                opacity: 0.8
              }
            },
            {
              type: 'text',
              z: 100,
              top: 85,
              left: 'center',
              style: {
                fill: '#999',
                text: '没有符合条件的数据',
                font: '14px Microsoft YaHei'
              }
            }
          ]
        }
      ]
    }, true);
  } else {
    // 如果有数据，清除无数据图标
    timeChart.setOption({
      ...timeOption,
      graphic: []
    }, true);

    memoryChart.setOption({
      ...memoryOption,
      graphic: []
    }, true);
  }
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
          width: 3,
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
      left: '3%',
      right: "8%",  // 确保右侧有足够空间
      containLabel: true
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
        // 在手动模式下添加双击提示
        if (!autoPopupEnabled) {
          tooltipContent += `<hr style="margin: 5px 0; border-top: 1px dashed #ccc;"/>`;
          tooltipContent += `<span style="color: #91CC75; font-size: 12px;">双击可弹出详情</span>`;
        }
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
      name: "Heap内存 (MB)",
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
      left: '3%',
      right: "8%",  // 确保右侧有足够空间
      containLabel: true
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
        // 在手动模式下添加双击提示
        if (!autoPopupEnabled) {
          tooltipContent += `<hr style="margin: 5px 0; border-top: 1px dashed #ccc;"/>`;
          tooltipContent += `<span style="color: #91CC75; font-size: 12px;">双击可弹出详情</span>`;
        }
        return tooltipContent;
      },
    },
  };
}
// 添加创建空图表配置的函数
// 修改createEmptyChartOption函数，保留坐标轴
function createEmptyChartOption(title, isTimeChart = true) {
  // 基本配置
  const option = {
    title: {
      text: title,
      left: 'center'
    },
    // 清空所有系列
    series: [],
    // 保留图例但不显示内容
    legend: {
      show: true,
      data: []
    },
    // 保留网格
    grid: {
      left: '3%',
      right: '5%',
      bottom: '18%',
      top: '20%',
      containLabel: true
    },
    // 清空提示框
    tooltip: {
      show: false
    },
    grid: {
      bottom: "18%",
      left: '3%',
      right: "8%",  // 确保右侧有足够空间
      containLabel: true
    },
    // 添加无数据图形
    graphic: [
      {
        type: 'group',
        left: 'center',
        top: 'middle',
        position: [0, -20],
        children: [
          {
            type: 'image',
            z: 0,
            style: {
              image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48cGF0aCBmaWxsPSIjZTBlMGUwIiBkPSJNMTI4IDI0YTEwNCAxMDQgMCAxIDAgMCAyMDggMTA0IDEwNCAwIDAgMCAwLTIwOHptMCAxOTJhODggODggMCAxIDEgMC0xNzYgODggODggMCAwIDEgMCAxNzZ6Ii8+PHBhdGggZmlsbD0iI2UwZTBlMCIgZD0iTTEyOCA4MGE4IDggMCAwIDAgLTggOHY0OGE4IDggMCAwIDAgMTYgMFY4OGE4IDggMCAwIDAgLTggLTh6bTAgODBhOCA4IDAgMSAwIDAgMTYgOCA4IDAgMCAwIDAgLTE2eiIvPjwvc3ZnPg==',
              width: 100,
              height: 100,
              opacity: 0.8
            }
          },
          {
            type: 'text',
            z: 1,
            style: {
              fill: '#999',
              text: '暂无数据',
              font: '16px Microsoft YaHei',
              fontWeight: 'bold'
            },
            left: 'center',
            top: 75
          }
        ]
      }
    ]
  };

  // 根据图表类型设置不同的坐标轴
  if (isTimeChart) {
    // 时间图表的坐标轴
    option.xAxis = {
      type: 'category',
      data: [],
      axisLabel: {
        rotate: 45
      }
    };
    option.yAxis = {
      type: 'value',
      name: '耗时 (秒)',
      nameLocation: 'end',
      nameGap: 10,
      nameTextStyle: {
        fontSize: 12,
        align: 'right'
      }
    };
  } else {
    // 内存图表的坐标轴
    option.xAxis = {
      type: 'category',
      data: [],
      axisLabel: {
        rotate: 45
      }
    };
    option.yAxis = {
      type: 'value',
      name: 'Heap内存 (MB)',
      nameLocation: 'end',
      nameGap: 10,
      nameTextStyle: {
        fontSize: 12,
        align: 'right'
      }
    };
  }

  return option;
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

  clearTimeout(hoverTimeout);
  const tipContainer = document.getElementById("hoverConfigTip");
  const sidePanel = document.getElementById("sideInfoPanel");

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

    // 更新面板标题
    document.querySelector('.panel-title').textContent = `构建详情: ${time}`;

    tipContainer.innerHTML = `
        <div class="config-group">
            <div class="config-subtitle">构建配置</div>
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

    // 根据开关状态决定是否自动显示侧边面板
    if (autoPopupEnabled && !sideInfoPanelVisible) {
      showSidePanel();
    }

    // 保存上一次的配置以便比较变化
    lastConfig = {
      config: currentConfig,
      cache: ngCacheInfo,
      device: deviceInfo
    };
  }
}
// 显示侧边面板
function showSidePanel() {
  const sidePanel = document.getElementById("sideInfoPanel");
  sidePanel.classList.add('active');
  sideInfoPanelVisible = true;
}
// 隐藏侧边面板
function hideSidePanel() {
  const sidePanel = document.getElementById("sideInfoPanel");
  sidePanel.classList.remove('active');
  sideInfoPanelVisible = false;
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
  let configItems = [];

  // 处理常规配置项
  Object.entries(currentConfig).forEach(([key, value]) => {
    if (key !== 'latestWebpackCacheFolders') {
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
      configItems.push(`
        <span class="config-item ${changed ? "config-changed" : ""}" data-key="${key}">
          ${key}: <span class="${valueClass}">${value}</span>
        </span>
      `);
    }
  });
  // 处理 webpack 缓存文件夹
  if (currentConfig.latestWebpackCacheFolders) {
    configItems.push(`
      <div class="cache-folder-title">
        angular-webpack 缓存目录（最近两项）
      </div>
    `);
    const folders = currentConfig.latestWebpackCacheFolders;
    const lastFolders = lastConfig?.latestWebpackCacheFolders || [];
    folders.forEach((folder, index) => {

      const lastFolder = lastFolders[index];
      const sizeChanged = lastFolder && lastFolder.size !== folder.size;
      const timeChanged = lastFolder && lastFolder.mtime !== folder.mtime;

      configItems.push(`
          <span class="config-item cache-folder-item" data-key="webpack-cache-${index}">
            <span class="folder-hash">...${folder.name.slice(folder.name.length - 8, folder.name.length)}</span>
            <span class="folder-size ${sizeChanged ? 'config-changed' : ''}">${folder.size}</span>
            <span class="folder-time ${timeChanged ? 'config-changed' : ''}">${folder.mtime}</span>
          </span>
        `);
    });

  }
  return `<div class="config-items">${configItems.join('')}</div>`;
}
