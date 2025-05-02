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
import { AnchoredText } from "../plugins/anchored-text/anchored-text.ts";
import { TrendLine, TrendLineDrawingTool } from '../plugins/drawings-plugin/trend-line.ts';
import { RectangleDrawingTool } from '../plugins/drawings-plugin/rectangle.ts';
import { TriangleDrawingTool } from '../plugins/drawings-plugin/triangle.ts';
import { FibChannelDrawingTool } from '../plugins/drawings-plugin/fibonacci-channel.ts';

import { VolumeProfile } from '../plugins/volume-profile/volume-profile.ts';
import { useDrawingsStore } from '../stores/drawings.ts';
import { DrawingType } from '../types/drawings.ts';
import { BandsIndicator } from '../plugins/indicators-plugin/bollinger-bands.ts'
import { SMAIndicator } from '../plugins/indicators-plugin/simple-moving-average.ts'
import { FibSpiralDrawingTool } from '../plugins/drawings-plugin/fibonacci-spiral.ts';
import { CurveDrawingTool } from '../plugins/drawings-plugin/curve.ts';
import { TimeLineDrawingTool } from '../plugins/drawings-plugin/time-line.ts';
import { FibWedgeDrawingTool } from '../plugins/drawings-plugin/fibonacci-wedge.ts';
import { PolylineDrawingTool } from '../plugins/drawings-plugin/polyline.ts';

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

function getDrawingTool(type) {
  return drawingTools[type.toLowerCase()]
}

// Lightweight Charts™ instances are stored as normal JS variables
// If you need to use a ref then it is recommended that you use `shallowRef` instead
let series;
let chart;
let drawingTools;
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

const createDrawingTools = (chart, series) => {
  let drawingTools = {
    "rectangle": new RectangleDrawingTool(chart, series),
    "triangle": new TriangleDrawingTool(chart, series),
    "fibonacci_channel": new FibChannelDrawingTool(chart, series),
    "fibonacci_spiral": new FibSpiralDrawingTool(chart, series),
    "curve": new CurveDrawingTool(chart, series),
    "trend_line": new TrendLineDrawingTool(chart, series),
    "time_line": new TimeLineDrawingTool(chart, series),
    // "fibonacci_wedge": new FibWedgeDrawingTool(chart, series), 
    // "polyline": new PolylineDrawingTool(chart, series),
  }
  
  for (let tool in drawingTools) {
    series.attachPrimitive(tool);
  }

  return drawingTools
}

let selectedDrawingTool = ref(DrawingType.Arrow)

drawingStore.$subscribe((mutation, store) => {
  if (store.currentDrawing === DrawingType.Arrow) return
  selectedDrawingTool.value = getDrawingTool(store.currentDrawing)
  selectedDrawingTool.value.startDrawing()
  drawingStore.currentDrawing = DrawingType.Arrow
})

const createTrendLine = (chart, series, point1, point2, width) => {
  const trendLine = new TrendLine(chart, series, point1, point2, {
    lineColor: 'red',
	  width: width,
	  showLabels: true,
	  labelBackgroundColor: 'blue',
	  labelTextColor: 'orange',
	});
  series.attachPrimitive(trendLine);
};

const createVolumeProfile = (chart, series, data) => {
  const basePrice = data[data.length - 50].value;
  const priceStep = Math.round(basePrice * 0.1);
  const profile = [];
  for (let i = 0; i < 15; i++) {
  	profile.push({
  		price: basePrice + i * priceStep,
  		vol: Math.round(Math.random() * 20),
  	});
  }
  const vpData = {
  	time: data[data.length - 150].time,
  	profile,
  	width: 100, // number of bars width
  };
  const vp = new VolumeProfile(chart, series, vpData);
  series.attachPrimitive(vp);
};

const createAnchoredText = (chart, series) => {
  const anchoredText = new AnchoredText({
       vertAlign: 'middle',
       horzAlign: 'middle',
       text: 'Witte',
       lineHeight: 54,
       font: 'bold 54px Arial',
       color: 'white',
     });
  series.attachPrimitive(anchoredText); 
};


// Creates the chart series and sets the data.
const addSeriesAndData = props => {
	const seriesDefinition = getChartSeriesDefinition(props.type);
	series = chart.addSeries(seriesDefinition, props.seriesOptions);
	series.setData(props.data);

  drawingTools = createDrawingTools(chart, series)
  // const smaIndicator = new SMAIndicator();
  // series.attachPrimitive(smaIndicator);
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

<style scoped>
</style>
