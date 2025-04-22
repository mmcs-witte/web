import { createChart, LineSeries } from 'lightweight-charts';
import { generateLineData } from '../../../../vendor/lw-charts/plugin-examples/src/sample-data.ts';
import { BandsIndicator } from '../bands-indicator.ts';

const chart = ((window as unknown as any).chart = createChart('chart', {
	autoSize: true,
}));

const lineSeries = chart.addSeries(LineSeries);
const data = generateLineData();
lineSeries.setData(data);

const bandIndicator = new BandsIndicator();
lineSeries.attachPrimitive(bandIndicator);
