<script setup>
import {
	ref,
	onMounted,
	onUnmounted,
	watch,
	defineExpose,
	defineProps,
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
import { TrendLine } from '../plugins/trend-line/trend-line.ts';
import { TriangleDrawingTool } from '../plugins/triangle-drawing-tool/triangle-drawing-tool.ts';
import { RectangleDrawingTool } from '../plugins/rectangle-drawing-tool/rectangle-drawing-tool.ts';
import { VolumeProfile } from '../plugins/volume-profile/volume-profile.ts';

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

// Lightweight Charts™ instances are stored as normal JS variables
// If you need to use a ref then it is recommended that you use `shallowRef` instead
let series;
let chart;

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

const createTrendLine = (chart, series, point1, point2, width) => {
  const trendLine = new TrendLine(chart, series, point1, point2, {
    lineColor: 'red',
	  width: 10,
	  showLabels: true,
	  labelBackgroundColor: 'blue',
	  labelTextColor: 'orange',
	});
  series.attachPrimitive(trendLine);
};

const createRectangleDrawingTool = (chart, series, ) => {
  const rectDrawing = new RectangleDrawingTool(chart, series, 
	  null,
    {
	    fillColor: 'rgba(200, 50, 100, 0.75)',
	    previewFillColor: 'rgba(200, 50, 100, 0.25)',
	    labelColor: 'rgba(200, 50, 100, 1)',
	    labelTextColor: 'white',
	    showLabels: true,
	    priceLabelFormatter: (price) => price.toFixed(2),
	    timeLabelFormatter: (time) => {
	    	if (typeof time == 'string') return time;
	    	const date = isBusinessDay(time)
	    		? new Date(time.year, time.month, time.day)
	    		: new Date(time * 1000);
	    	return date.toLocaleDateString();
	    },
  }
  );
  series.attachPrimitive(rectDrawing);
};

const createTriangleDrawingTool = (chart, series) => {
  const triangle = new TriangleDrawingTool(
	chart,
	series,
	null,
	{
		showLabels: false,
	}
  );
  series.attachPrimitive(triangle);
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

// Creates the chart series and sets the data.
const addSeriesAndData = props => {
	const seriesDefinition = getChartSeriesDefinition(props.type);
	series = chart.addSeries(seriesDefinition, props.seriesOptions);
	series.setData(props.data);

  const dataLength = props.data.length;
  const point1 = {
  	time: props.data[dataLength - 50].time,
  	price: props.data[dataLength - 50].value * 0.9,
  };
  const point2 = {
  	time: props.data[dataLength - 5].time,
  	price: props.data[dataLength - 5].value * 1.10,
  };

  // createTrendLine(chart, series, point1, point2, 10);
  // createTriangleDrawingTool(chart, series);
  //createRectangleDrawingTool(chart, series);
  createVolumeProfile(chart, series, props.data);
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
