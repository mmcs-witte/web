import { WhitespaceData, createChart } from 'lightweight-charts';
import { StackedBarsSeries } from '../stacked-bars-series.ts';
import { StackedBarsData } from '../data.ts';
import { multipleBarData } from '../../../../vendor/lw-charts/plugin-examples/src/sample-data.ts';

const chart = ((window as unknown as any).chart = createChart('chart', {
	autoSize: true,
	timeScale: {
		minBarSpacing: 3,
	}
}));

const customSeriesView = new StackedBarsSeries();
const myCustomSeries = chart.addCustomSeries(customSeriesView, {
	/* Options */
	color: 'black', // for the price line
});

const data: (StackedBarsData | WhitespaceData)[] = multipleBarData(3, 200, 20);
myCustomSeries.setData(data);
