<script setup>
import {
  ref,
  onMounted,
  onUnmounted,
  watch
} from 'vue';
import {
  createChart,
  LineSeries,
  AreaSeries,
  BarSeries,
  CandlestickSeries,
  HistogramSeries,
  BaselineSeries,
} from 'lightweight-charts';
import { TrendLineDrawingTool } from "interactive-lw-charts-tools";
import { RectangleDrawingTool } from "interactive-lw-charts-tools";
import { TriangleDrawingTool } from "interactive-lw-charts-tools";
import { FibChannelDrawingTool } from "interactive-lw-charts-tools";
import { FibSpiralDrawingTool } from "interactive-lw-charts-tools";
import { CurveDrawingTool } from "interactive-lw-charts-tools";
import { TimeLineDrawingTool } from "interactive-lw-charts-tools";
import { FibWedgeDrawingTool } from "interactive-lw-charts-tools";
import { PolylineDrawingTool } from "interactive-lw-charts-tools";
import { SMAIndicator } from "interactive-lw-charts-tools";
import { BandsIndicator } from "interactive-lw-charts-tools";

import { useDrawingsStore } from '../stores/drawings.ts';
import { DrawingType } from '../types/drawings.ts';
import { useIndicatorsStore } from '../stores/indicators.ts';

const props = defineProps({
  type: {
    type: String,
    default: 'line',
  },
  data: {
    type: Array,
    required: true,
  },
  autosize: {
    default: true,
    type: Boolean,
  },
  chartOptions: {
    type: Object,
  },
  seriesOptions: {
    type: Object,
  },
  timeScaleOptions: {
    type: Object,
  },
  priceScaleOptions: {
    type: Object,
  },
});

function getChartSeriesDefinition(type) {
  switch (type.toLowerCase()) {
    case 'line':
      return LineSeries;
    case 'area':
      return AreaSeries;
    case 'bar':
      return BarSeries;
    case 'candlestick':
      return CandlestickSeries;
    case 'histogram':
      return HistogramSeries;
    case 'baseline':
      return BaselineSeries;
  }
  return LineSeries;
}


function getChartIndicatorsDefinition(type) {
  switch (type.toLowerCase()) {
    case 'sma':
      return new SMAIndicator();
    case 'bollinger-bands':
      return new BandsIndicator();
  }
}

function getDrawingTool(type) {
  return drawingTools[type.toLowerCase()]
}

// Lightweight Charts™ instances are stored as normal JS variables
// If you need to use a ref then it is recommended that you use `shallowRef` instead
let series;
let chart;
let drawingTools;
let selectedDrawingToolType = ref(DrawingType.None);
let selectedDrawingTool = ref();

let indicatorsList;

const chartContainer = ref();

const fitContent = () => {
  if (!chart) return;
  chart.timeScale().fitContent();
};

const getChart = () => {
  return chart;
};

defineExpose({ fitContent, getChart });

// Auto resizes the chart when the browser window is resized.
const resizeHandler = () => {
  if (!chart || !chartContainer.value) return;
  const dimensions = chartContainer.value.getBoundingClientRect();
  chart.resize(dimensions.width, dimensions.height);
};

const drawingStore = useDrawingsStore()
const indicatorsStore = useIndicatorsStore()

const createDrawingTools = (chart, series) => {
  let drawingTools = {
    "trend_line": new TrendLineDrawingTool(chart, series),
    "time_line": new TimeLineDrawingTool(chart, series),
    "triangle": new TriangleDrawingTool(chart, series),
    "rectangle": new RectangleDrawingTool(chart, series),
    "fibonacci_channel": new FibChannelDrawingTool(chart, series),
    "fibonacci_spiral": new FibSpiralDrawingTool(chart, series),
    "fibonacci_wedge": new FibWedgeDrawingTool(chart, series),
    "curve": new CurveDrawingTool(chart, series),
    "polyline": new PolylineDrawingTool(chart, series),
  }

  for (let tool in drawingTools) {
    series.attachPrimitive(tool);
  }

  return drawingTools
}

drawingStore.$subscribe((mutation, store) => {
  if (store.currentDrawing == DrawingType.None) {
    return;
  }
  
  if (selectedDrawingTool.value) {
    selectedDrawingTool.value.stopDrawing();
  }

  selectedDrawingToolType.value = store.currentDrawing;
  selectedDrawingTool.value = getDrawingTool(selectedDrawingToolType.value);
  selectedDrawingTool.value.startDrawing();

  store.currentDrawing = DrawingType.None;
})

indicatorsStore.$subscribe((mutation, store) => {
  console.log(store.addedIndicator)
  if (store.addedIndicator === null) return

  if (indicatorsList.includes(store.addedIndicator)) {
    store.addedIndicator = null
    return
  }

  addIndicator(store.addedIndicator.type)

  indicatorsList.push(store.addedIndicator)
  store.addedIndicator = null
})

const addIndicator = (indicatorType) => {
  const indicator = getChartIndicatorsDefinition(indicatorType);
  series.attachPrimitive(indicator);
  chart.timeScale().fitContent();
}

// Creates the chart series and sets the data.
const addSeriesAndData = props => {
  const seriesDefinition = getChartSeriesDefinition(props.type);
  series = chart.addSeries(seriesDefinition, props.seriesOptions);
  series.setData(props.data);

  drawingTools = createDrawingTools(chart, series)
};

onMounted(() => {
  // Create the Lightweight Charts Instance using the container ref.
  chart = createChart(chartContainer.value, props.chartOptions);
  addSeriesAndData(props);

  if (props.priceScaleOptions) {
    chart.priceScale().applyOptions(props.priceScaleOptions);
  }

  if (props.timeScaleOptions) {
    chart.timeScale().applyOptions(props.timeScaleOptions);
  }

  // chart.applyOptions({
  // 		crosshair: {
  // 			mode: CrosshairMode.Normal,
  // 		},
  // 	})

  chart.timeScale().fitContent();

  if (props.autosize) {
    window.addEventListener('resize', resizeHandler);
  }

  indicatorsList = []
});

onUnmounted(() => {
  if (chart) {
    chart.remove();
    chart = null;
  }
  if (series) {
    series = null;
  }
  window.removeEventListener('resize', resizeHandler);
});

/*
 * Watch for changes to any of the component properties.

 * If an options property is changed then we will apply those options
 * on top of any existing options previously set (since we are using the
 * `applyOptions` method).
 *
 * If there is a change to the chart type, then the existing series is removed
 * and the new series is created, and assigned the data.
 *
 */
watch(
  () => props.autosize,
  enabled => {
    if (!enabled) {
      window.removeEventListener('resize', resizeHandler);
      return;
    }
    window.addEventListener('resize', resizeHandler);
  }
);

watch(
  () => props.type,
  newType => {
    if (series && chart) {
      chart.removeSeries(series);
    }
    addSeriesAndData(props);
  }
);

watch(
  () => props.data,
  newData => {
    if (!series) return;
    series.setData(newData);
  }
);

watch(
  () => props.chartOptions,
  newOptions => {
    if (!chart) return;
    chart.applyOptions(newOptions);
  }
);

watch(
  () => props.seriesOptions,
  newOptions => {
    if (!series) return;
    series.applyOptions(newOptions);
  }
);

watch(
  () => props.priceScaleOptions,
  newOptions => {
    if (!chart) return;
    chart.priceScale().applyOptions(newOptions);
  }
);

watch(
  () => props.timeScaleOptions,
  newOptions => {
    if (!chart) return;
    chart.timeScale().applyOptions(newOptions);
  }
);
</script>

<template>
  <div class="h-full bg-gray-600" ref="chartContainer"></div>
</template>

<style scoped></style>
