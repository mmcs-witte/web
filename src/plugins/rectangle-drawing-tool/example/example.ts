import { LineSeries, createChart } from 'lightweight-charts';
import { generateLineData } from '../../../../vendor/lw-charts/plugin-examples/src/sample-data.ts';
import { RectangleDrawingTool } from '../rectangle-drawing-tool.ts';

const chart = ((window as unknown as any).chart = createChart('chart', {
	autoSize: true,
}));

const lineSeries = chart.addSeries(LineSeries);
const data = generateLineData();
lineSeries.setData(data);

new RectangleDrawingTool(
	chart,
	lineSeries,
	document.querySelector<HTMLDivElement>('#toolbar')!,
	{
		showLabels: false,
	}
);
