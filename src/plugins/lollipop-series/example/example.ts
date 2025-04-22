import { WhitespaceData, createChart } from 'lightweight-charts';
import { generateLineData, shuffleValuesWithLimit } from '../../../../vendor/lw-charts/plugin-examples/src/sample-data.ts';
import { LollipopSeries } from '../lollipop-series.ts';
import { LollipopData } from '../data.ts';

const chart = ((window as unknown as any).chart = createChart('chart', {
	autoSize: true,
}));

const customSeriesView = new LollipopSeries();
const myCustomSeries = chart.addCustomSeries(customSeriesView, {
	/* Options */
	lineWidth: 2,
});

const data: (LollipopData | WhitespaceData)[] = shuffleValuesWithLimit(generateLineData(100), 10);
myCustomSeries.setData(data);
