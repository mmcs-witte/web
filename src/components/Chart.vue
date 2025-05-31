<!-- eslint-disable vue/multi-word-component-names -->
<script setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import { ref } from 'vue';

import {
	CrosshairMode
} from 'lightweight-charts';

/*
 * There are example components in both API styles: Options API, and Composition API
 *
 * Select your preferred style from the imports below:
 */
import LWChart from "./LWChart.vue";
import { useChartStore } from "@/stores/chart";

const chartStore = useChartStore();

/**
 * Generates sample data for the Lightweight Charts™ example
 * @param  {Boolean} ohlc Whether generated dat should include open, high, low, and close values
 * @returns {Array} sample data
 */
function generateSampleData(ohlc) {
  const randomFactor = 25 + Math.random() * 25;
  function samplePoint(i) {
    return (
      i *
      (0.5 +
        Math.sin(i / 10) * 0.2 +
        Math.sin(i / 20) * 0.4 +
        Math.sin(i / randomFactor) * 0.8 +
        Math.sin(i / 500) * 0.5) +
      200
    );
  }

  const res = [];
  let date = new Date(Date.UTC(2018, 0, 1, 0, 0, 0, 0));
  const numberOfPoints = ohlc ? 100 : 500;
  for (var i = 0; i < numberOfPoints; ++i) {
    const time = date.getTime() / 1000;
    const value = samplePoint(i);
    if (ohlc) {
      const randomRanges = [
        -1 * Math.random(),
        Math.random(),
        Math.random(),
      ].map(i => i * 10);
      const sign = Math.sin(Math.random() - 0.5);
      res.push({
        time,
        low: value + randomRanges[0],
        high: value + randomRanges[1],
        open: value + sign * randomRanges[2],
        close: samplePoint(i + 1),
      });
    } else {
      res.push({
        time,
        value,
      });
    }

    date.setUTCDate(date.getUTCDate() + 1);
  }

  return res;
}

const chartOptions = ref({
  layout: {
    attributionLogo: false,
    background: {
      color: getComputedStyle(document.documentElement).getPropertyValue('--color-gray-800')
    },
    textColor: '#eee'
  },
  grid: {
    vertLines: { color: '#444' },
    horzLines: { color: '#444' },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: {
        visible: true,
        labelVisible: true,
    },
    horzLine: {
        visible: true,
        labelVisible: true,
    }
  },
  });
const data = ref(generateSampleData(false));
// Setting series options manually
// TODO: set it from code later
const seriesOptions = ref({
  color: 'rgb(255, 0, 0)',
  priceLineVisible: false,
	lastValueVisible: true,
  
});

const chartType = ref(chartStore.currentType);
const lwChart = ref();

chartStore.$subscribe((mutation, state) => {
  chartType.value = state.currentType
  changeData()
})

const changeData = () => {
  const candlestickTypeData = ['candlestick', 'bar'].includes(chartType.value);
  const newData = generateSampleData(candlestickTypeData);
  data.value = newData;
  if (chartType.value === 'baseline') {
    const average =
      newData.reduce((s, c) => {
        return s + c.value;
      }, 0) / newData.length;
    seriesOptions.value = { 
      baseValue: { type: 'price', price: average },
      priceLineVisible: false,
	    lastValueVisible: true,
      color: 'rgb(255, 0, 0)'
    };
  }
};

const changeType = (newType=null) => {
  const types = [
    'line',
    'area',
    'baseline',
    'histogram',
    'candlestick',
    'bar',
  ].filter(t => t !== chartType.value);
  const randIndex = Math.round(Math.random() * (types.length - 1));
  chartType.value = types[randIndex];
  changeData();

  // call a method on the component.
  lwChart.value.fitContent();
};
</script>

<template>
  <div class="chart-container h-full rounded-md">
    <LWChart
      :type="chartType"
      :data="data"
      :autosize="true"
      :chart-options="chartOptions"
      :series-options="seriesOptions"
      ref="lwChart"
    />
  </div>
</template>

<style scoped>
</style>
