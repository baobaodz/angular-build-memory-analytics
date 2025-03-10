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
};
// 修改后的文件处理函数
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      let content = e.target.result;
      // 先处理所有的空白字符
      content = content.trim();
      // 使用\s*处理空格和换行，同时确保中间不包含]或[
      content = content.replace(/\]\s*((?!.*[\[\]])[\s\S])*?\s*\[/g, ",");

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
  isHorizontalLayout = !isHorizontalLayout;
  chartContainer.className = isHorizontalLayout
    ? "horizontal-layout"
    : "vertical-layout";
  mainContainer.style.maxWidth = isHorizontalLayout ? "100%" : "1200px";

  // ECharts 自适应
  setTimeout(() => {
    timeChart.resize();
    memoryChart.resize();
  }, 300);
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
        data: data.compileHeap,
        itemStyle: {
          color: "#91CC75",
        },
        label: {
          // 新增数值标签
          show: true,
          position: "top",
          formatter: "{@y}MB",
          color: "#91CC75",
          fontSize: 12,
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
        data: data.optimizeHeap,
        itemStyle: {
          color: "#FAC858",
        },
        label: {
          show: true,
          position: "top",
          formatter: "{@y}MB",
          color: "#FAC858",
          fontSize: 12,
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
    const adjustedTime = new Date(rawTime.getTime() + 8 * 3600 * 1000);

    // 格式化为 "MM-DD HH:mm"
    const timeStr = formatTime(adjustedTime);
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
    const adjustedTime = new Date(rawTime.getTime() + 8 * 3600 * 1000);
    const entryTime = formatTime(adjustedTime);
    return entryTime === time;
  });

  if (matchedData && matchedData.buildConfigurations) {
    const currentConfig = matchedData.buildConfigurations;
    tipContainer.innerHTML = `
        <div class="config-group">
            <div class="config-subtitle">构建时间: ${time}</div>
            ${renderConfigItemsWithDiff(currentConfig, lastConfig)}
        </div>
      `;
    tipContainer.classList.add("active");
    lastConfig = currentConfig;
  } else {
    tipContainer.classList.remove("active");
  }
}
function renderConfigItemsWithDiff(currentConfig, lastConfig) {
  return `<div class="config-items">
      ${Object.entries(currentConfig)
        .map(([key, value]) => {
          const changed = lastConfig && lastConfig[key] !== value;
          return `
            <span class="config-item ${changed ? "config-changed" : ""}">
              ${key}: <span class="config-value-${value}">${value}</span>
            </span>
          `;
        })
        .join("")}
    </div>`;
}
