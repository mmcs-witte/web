import { CanvasRenderingTarget2D } from 'fancy-canvas';
import type {
	//AutoscaleInfo,
	BarData,
	Coordinate,
	DataChangedScope,
	ISeriesPrimitive,
	IPrimitivePaneRenderer,
	IPrimitivePaneView,
	LineData,
	//Logical,
	SeriesAttachedParameter,
	SeriesDataItemTypeMap,
	SeriesType,
	Time,
} from 'lightweight-charts';
import { ChartInstrumentBase } from '../chart-instrument-base.ts';
import { cloneReadonly } from '../../helpers/simple-clone.ts';
import { ClosestTimeIndexFinder } from '../../helpers/closest-index.ts';

interface SMARendererData {
	x: Coordinate | number;
	average: Coordinate | number;
}

class SMAIndicatorPaneRenderer implements IPrimitivePaneRenderer {
	_viewData: SMAViewData;
	constructor(data: SMAViewData) {
		this._viewData = data;
	}
	draw() {}
	drawBackground(target: CanvasRenderingTarget2D) {
		const points: SMARendererData[] = this._viewData.data;
		target.useBitmapCoordinateSpace(scope => {
			const ctx = scope.context;
			ctx.scale(scope.horizontalPixelRatio, scope.verticalPixelRatio);

			ctx.lineWidth = this._viewData.options.lineWidth;
			ctx.beginPath();
			const linesAvg = new Path2D();
			linesAvg.moveTo(points[0].x, points[0].average);
			for (const point of points) {
				linesAvg.lineTo(point.x, point.average);
			}

			// drawing down lines
      ctx.lineWidth = this._viewData.options.lineWidth;
      ctx.strokeStyle = this._viewData.options.lineColor;
      ctx.stroke(linesAvg);
		});
	}
}

interface SMAViewData {
	data: SMARendererData[];
	options: Required<SMAIndicatorOptions>;
}

class SMAIndicatorPaneView implements IPrimitivePaneView {
	_source: SMAIndicator;
	_data: SMAViewData;

	constructor(source: SMAIndicator) {
		this._source = source;
		this._data = {
			data: [],
			options: this._source._options,
		};
	}

	update() {
		const series = this._source.series;
		const timeScale = this._source.chart.timeScale();
		this._data.data = this._source._smaData.map(d => {
			return {
				x: timeScale.timeToCoordinate(d.time) ?? -100,
				average: series.priceToCoordinate(d.average) ?? -100,
			};
		});
	}

	renderer() {
		return new SMAIndicatorPaneRenderer(this._data);
	}
}

interface SMAData {
	time: Time;
	average: number;
}

function extractPrice(
	dataPoint: SeriesDataItemTypeMap[SeriesType]
): number | undefined {
	if ((dataPoint as BarData).close) return (dataPoint as BarData).close;
	if ((dataPoint as LineData).value) return (dataPoint as LineData).value;
	return undefined;
}

export interface SMAIndicatorOptions {
	lineColor?: string;
	lineWidth?: number;
}

const defaults: Required<SMAIndicatorOptions> = {
  lineColor:'rgb(246, 242, 8)',
	lineWidth: 5,
};

export class SMAIndicator extends ChartInstrumentBase implements ISeriesPrimitive<Time> {
	_paneViews: SMAIndicatorPaneView[];
	_seriesData: SeriesDataItemTypeMap[SeriesType][] = [];
	_smaData: SMAData[] = [];
	_options: Required<SMAIndicatorOptions>;
	_timeIndices: ClosestTimeIndexFinder<{ time: number }>;
  _depth: number = 50;

	constructor(options: SMAIndicatorOptions = {}) {
		super();
		this._options = { ...defaults, ...options };
		this._paneViews = [new SMAIndicatorPaneView(this)];
		this._timeIndices = new ClosestTimeIndexFinder([]);
	}

	updateAllViews() {
		this._paneViews.forEach(pw => pw.update());
	}

	paneViews() {
		return this._paneViews;
	}

	attached(p: SeriesAttachedParameter<Time>): void {
		super.attached(p);
		this.dataUpdated('full');
	}

	dataUpdated(scope: DataChangedScope) {
		// plugin base has fired a data changed event
		this._seriesData = cloneReadonly(this.series.data());
		this.calculateSMA();
		if (scope === 'full') {
			this._timeIndices = new ClosestTimeIndexFinder(
				this._seriesData as { time: number }[]
			);
		}
	}

	calculateSMA() {
		const smaData: SMAData[] = new Array(this._seriesData.length - this._depth);
    const seriesDataPriceCache: number[] = new Array(this._seriesData.length);
    let index = 0;

		this._seriesData.forEach(d => {
			const price = extractPrice(d);
			if (price === undefined) return;

      seriesDataPriceCache[index] = price;

      if (index >= this._depth) {
        let avgPrice: number = 0;
        for (let i = index - 1; i > index - this._depth; i--) {
          avgPrice += seriesDataPriceCache[i];
        }
        avgPrice /= this._depth == 0 ? 1.0 : this._depth;

        smaData[index - this._depth] = {
          average: avgPrice,
          time: d.time,
        };
      }
      index += 1;

		});
		smaData.length = Math.max(0, index - this._depth);
		this._smaData = smaData;
  }
}
