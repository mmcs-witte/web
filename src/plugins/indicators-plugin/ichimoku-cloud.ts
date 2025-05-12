import { CanvasRenderingTarget2D } from 'fancy-canvas';
import type {
	AutoscaleInfo,
	BarData,
	Coordinate,
	DataChangedScope,
	ISeriesPrimitive,
	IPrimitivePaneRenderer,
	IPrimitivePaneView,
	LineData,
	Logical,
	SeriesAttachedParameter,
	SeriesDataItemTypeMap,
	SeriesType,
	Time,
} from 'lightweight-charts';
import { ChartInstrumentBase } from '../chart-instrument-base.ts';
import { cloneReadonly } from '../../helpers/simple-clone.ts';
import { ClosestTimeIndexFinder } from '../../helpers/closest-index.ts';
import { UpperLowerInRange } from '../../helpers/min-max-in-range.ts';

interface BandRendererData {
	x: Coordinate | number;
	upper: Coordinate | number;
	lower: Coordinate | number;
}

class BandsIndicatorPaneRenderer implements IPrimitivePaneRenderer {
	_viewData: BandViewData;
	constructor(data: BandViewData) {
		this._viewData = data;
	}
	draw() {}
	drawBackground(target: CanvasRenderingTarget2D) {
		const points: BandRendererData[] = this._viewData.data;
		target.useBitmapCoordinateSpace(scope => {
			const ctx = scope.context;
			ctx.scale(scope.horizontalPixelRatio, scope.verticalPixelRatio);

			ctx.lineWidth = this._viewData.options.lineWidth;
			ctx.beginPath();
			const region = new Path2D();
			const linesUp = new Path2D();
			const linesDown = new Path2D();
			region.moveTo(points[0].x, points[0].upper);
			linesUp.moveTo(points[0].x, points[0].upper);
			for (const point of points) {
				region.lineTo(point.x, point.upper);
				linesUp.lineTo(point.x, point.upper);
			}
			const end = points.length - 1;
			region.lineTo(points[end].x, points[end].lower);
			linesDown.moveTo(points[end].x, points[end].lower);
			for (let i = points.length - 2; i >= 0; i--) {
				region.lineTo(points[i].x, points[i].lower);
				linesDown.lineTo(points[i].x, points[i].lower);
			}
			region.lineTo(points[0].x, points[0].upper);
			region.closePath();
			
      // drawing up lines
      ctx.strokeStyle = this._viewData.options.lineUpColor;
      ctx.stroke(linesUp);

			// drawing down lines
      ctx.strokeStyle = this._viewData.options.lineDownColor;
      ctx.stroke(linesDown);
			ctx.fillStyle = this._viewData.options.fillColor;
			ctx.fill(region);
		});
	}
}

interface BandViewData {
	data: BandRendererData[];
	options: Required<BandsIndicatorOptions>;
}

class BandsIndicatorPaneView implements IPrimitivePaneView {
	_source: BandsIndicator;
	_data: BandViewData;

	constructor(source: BandsIndicator) {
		this._source = source;
		this._data = {
			data: [],
			options: this._source._options,
		};
	}

	update() {
		const series = this._source.series;
		const timeScale = this._source.chart.timeScale();
		this._data.data = this._source._bandsData.map(d => {
			return {
				x: timeScale.timeToCoordinate(d.time) ?? -100,
				upper: series.priceToCoordinate(d.upper) ?? -100,
				lower: series.priceToCoordinate(d.lower) ?? -100,
			};
		});
	}

	renderer() {
		return new BandsIndicatorPaneRenderer(this._data);
	}
}

interface BandData {
	time: Time;
	upper: number;
	lower: number;
}

function extractPrice(
	dataPoint: SeriesDataItemTypeMap[SeriesType]
): number | undefined {
	if ((dataPoint as BarData).close) return (dataPoint as BarData).close;
	if ((dataPoint as LineData).value) return (dataPoint as LineData).value;
	return undefined;
}

export interface BandsIndicatorOptions {
	lineUpColor?: string;
	lineDownColor?: string;
	fillColor?: string;
	lineWidth?: number;
}

const defaults: Required<BandsIndicatorOptions> = {
  lineUpColor:'rgb(200, 25, 25)',
	lineDownColor: 'rgb(25, 200, 100)',
	fillColor: 'rgba(58, 217, 223, 0.25)',
	lineWidth: 1,
};

export class BandsIndicator extends ChartInstrumentBase implements ISeriesPrimitive<Time> {
	_paneViews: BandsIndicatorPaneView[];
	_seriesData: SeriesDataItemTypeMap[SeriesType][] = [];
	_bandsData: BandData[] = [];
	_options: Required<BandsIndicatorOptions>;
	_timeIndices: ClosestTimeIndexFinder<{ time: number }>;
	_upperLower: UpperLowerInRange<BandData>;

	constructor(options: BandsIndicatorOptions = {}) {
		super();
		this._options = { ...defaults, ...options };
		this._paneViews = [new BandsIndicatorPaneView(this)];
		this._timeIndices = new ClosestTimeIndexFinder([]);
		this._upperLower = new UpperLowerInRange([]);
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
		this.calculateBands();
		if (scope === 'full') {
			this._timeIndices = new ClosestTimeIndexFinder(
				this._seriesData as { time: number }[]
			);
		}
	}

	_minValue: number = Number.POSITIVE_INFINITY;
	_maxValue: number = Number.NEGATIVE_INFINITY;
	calculateBands() {
		const bandData: BandData[] = new Array(this._seriesData.length);
		let index = 0;
		this._minValue = Number.POSITIVE_INFINITY;
		this._maxValue = Number.NEGATIVE_INFINITY;
		this._seriesData.forEach(d => {
			const price = extractPrice(d);
			if (price === undefined) return;
			const upper = price * 1.1;
			const lower = price * 0.9;
			if (upper > this._maxValue) this._maxValue = upper;
			if (lower < this._minValue) this._minValue = lower;
			bandData[index] = {
				upper,
				lower,
				time: d.time,
			};
			index += 1;
		});
		bandData.length = index;
		this._bandsData = bandData;
		this._upperLower = new UpperLowerInRange(this._bandsData, 4);
	}

	autoscaleInfo(startTimePoint: Logical, endTimePoint: Logical): AutoscaleInfo {
		const ts = this.chart.timeScale();
		const startTime = (ts.coordinateToTime(
			ts.logicalToCoordinate(startTimePoint) ?? 0
		) ?? 0) as number;
		const endTime = (ts.coordinateToTime(
			ts.logicalToCoordinate(endTimePoint) ?? 5000000000
		) ?? 5000000000) as number;
		const startIndex = this._timeIndices.findClosestIndex(startTime, 'left');
		const endIndex = this._timeIndices.findClosestIndex(endTime, 'right');
		const range = this._upperLower.getMinMax(startIndex, endIndex);
		return {
			priceRange: {
				minValue: range.lower,
				maxValue: range.upper,
			},
		};
	}
}
