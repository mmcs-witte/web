import { createChart, LineSeries } from 'lightweight-charts';
import { generateLineData } from '../../../../vendor/lw-charts/plugin-examples/src/sample-data.ts';
import { OverlayPriceScale } from '../overlay-price-scale.ts';

const chart = ((window as unknown as any).chart = createChart('chart', {
	autoSize: true,
	rightPriceScale: {
		visible: false,
	},
	grid: {
		horzLines: {
			visible: false,
		},
	},
}));

const lineSeries = chart.addSeries(LineSeries, {
	priceScaleId: 'overlay',
});

const data = generateLineData();
lineSeries.setData(data);

lineSeries.attachPrimitive(new OverlayPriceScale({}));
