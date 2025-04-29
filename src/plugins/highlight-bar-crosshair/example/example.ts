import { CandlestickSeries, createChart } from 'lightweight-charts';
import { generateAlternativeCandleData } from '../../../../vendor/lw-charts/plugin-examples/src/sample-data.ts';
import { CrosshairHighlightPrimitive } from '../highlight-bar-crosshair.ts';

const chart = ((window as unknown as any).chart = createChart('chart', {
	autoSize: true,
}));

const candleSeries = chart.addSeries(CandlestickSeries);
candleSeries.setData(generateAlternativeCandleData());

const highlightPrimitive = new CrosshairHighlightPrimitive({
	color: 'rgba(0, 50, 100, 0.2)',
});

candleSeries.attachPrimitive(highlightPrimitive);
