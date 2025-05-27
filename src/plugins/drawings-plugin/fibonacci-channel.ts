import { CanvasRenderingTarget2D } from 'fancy-canvas';
import type {
	Coordinate,
	IChartApi,
	ISeriesApi,
	ISeriesPrimitiveAxisView,
	IPrimitivePaneRenderer,
	IPrimitivePaneView,
	MouseEventParams,
	PrimitivePaneViewZOrder,
	SeriesType,
	Time,
	PrimitiveHoveredItem,
} from 'lightweight-charts';

import {
	isBusinessDay
} from 'lightweight-charts';

import { DrawingBase, DrawingToolBase, RectangleAxisPaneRenderer, type Point, type ViewPoint } from './drawing-base.ts';
import { Point as Point2D } from '@flatten-js/core';
import { Segment } from '@flatten-js/core';
import { Vector as Vector2D } from '@flatten-js/core';
import { calculateDrawingPoint, convertViewPointToPoint2D } from './conversion-helper.ts';

class FibChannelPaneRenderer implements IPrimitivePaneRenderer {
	_points: ViewPoint[];
	_options: FibChannelOptions;

	constructor(points: ViewPoint[], options: FibChannelOptions) {
		this._points = new Array<ViewPoint>(points.length);
		for (let i = 0; i < points.length; i++) {
			this._points[i] = points[i];
		}
		this._options = options;
	}
	draw(target: CanvasRenderingTarget2D) {
		target.useBitmapCoordinateSpace(scope => {
			if (this._points.length < 2) {
				return;
			}

			const ctx = scope.context;

			for (let i = 0; i < this._points.length; i++) {
				this._points[i] = calculateDrawingPoint(this._points[i], scope);
			}
      
      const p0 = convertViewPointToPoint2D(this._points[0]);
      const p1 = convertViewPointToPoint2D(this._points[1]);

			const dir: Vector2D = new Vector2D(0, p1.y - p0.y);

			ctx.font = '36px Arial';

			const fibonacciLevels = this._options.fibonacciLevels;
			const fibonacciLineColors = this._options.fibonacciLineColors;

			const oldGlobalAlpha = ctx.globalAlpha;
			ctx.globalAlpha = 0.25;

			//  filling background first
			for (let i: number = 0; i < fibonacciLevels.length; i++) {
				const currIndex = i;
				const nextIndex = currIndex + 1 < fibonacciLevels.length ? currIndex + 1 : currIndex;
				const curLevel: number = fibonacciLevels[currIndex];
				const nextLevel: number = fibonacciLevels[nextIndex];
				if (currIndex != nextIndex) {
					ctx.fillStyle = fibonacciLineColors[nextIndex % fibonacciLineColors.length];
					const currY = new Vector2D(0, p0.y).add(dir.scale(0, curLevel)).y;
					const nextY = new Vector2D(0, p0.y).add(dir.scale(0, nextLevel)).y;

					ctx.beginPath();
					ctx.moveTo(p0.x, currY);
					ctx.lineTo(p1.x, currY);
					ctx.lineTo(p1.x, nextY);
					ctx.lineTo(p0.x, nextY);
					ctx.fill();
				}
			}

			ctx.globalAlpha = oldGlobalAlpha;

			for (let i: number = 0; i < fibonacciLevels.length; i++) {
				ctx.strokeStyle = fibonacciLineColors[i % fibonacciLineColors.length];
				ctx.fillStyle = fibonacciLineColors[i % fibonacciLineColors.length];
				ctx.lineWidth = 5;

				const level = fibonacciLevels[i];
				const y = new Vector2D(0, p0.y).add(dir.scale(0, level)).y;
				ctx.beginPath();
				ctx.moveTo(p0.x, y);
				ctx.lineTo(p1.x, y);
				ctx.stroke();
				ctx.fillText(`${(level * 100).toFixed(1)}%`, (p1.x + 4), (y - 2));
			}
		});
	}

	hitTest(x: number, y: number): PrimitiveHoveredItem | null {
		if (this._points.length < 2) {
			return null;
		}

		const tolerance: number = 3e-0;
		let hit: boolean = false;
		const hitTestPoint: Point2D = new Point2D(x, y);

    const p0 = convertViewPointToPoint2D(this._points[0]);
    const p1 = convertViewPointToPoint2D(this._points[1]);

		const high = Math.min(p0.y, p1.y);
		const low = Math.max(p0.y, p1.y);
		const height = low - high;

		for (let i: number = 0; i < this._options.fibonacciLevels.length; i++) {
			const level = this._options.fibonacciLevels[i];
			const y = low - height * level;
			const line = new Segment(new Point2D(p0.x, y), new Point2D(p1.x, y));
			if (line.distanceTo(hitTestPoint)[0] < tolerance) {
				hit = true;
				break;
			}
		}
		
		if (hit) {
			return {
				cursorStyle: "grab",
				externalId: "fib-channel-drawing",
				zOrder: "top",
			};
		} else {
			return null;
		}
	}
}

class FibChannelPaneView implements IPrimitivePaneView {
	_source: FibChannel;
	_points: Point[];
	_drawingPoints: ViewPoint[];

	constructor(source: FibChannel) {
		this._source = source;
		this._points = source._points;
		this._drawingPoints = new Array<ViewPoint>(source._points.length);
	}

	update() {
		this._points = this._source._points;
		this._drawingPoints = new Array<ViewPoint>(this._source._points.length);

		const series = this._source.series;
		const timeScale = this._source.chart.timeScale();
		for (let i = 0; i < this._points.length; ++i) {
			const x = timeScale.timeToCoordinate(this._points[i].time);
			const y = series.priceToCoordinate(this._points[i].price);
			this._drawingPoints[i] = { x: x, y: y };
		}
	}

	renderer() {
		return new FibChannelPaneRenderer(
			this._drawingPoints,
			this._source._options,
		);
	}
}

abstract class FibChannelAxisPaneView implements IPrimitivePaneView {
	_source: FibChannel;
	_minPoint: number | null = null;
	_maxPoint: number | null = null;
	_vertical: boolean = false;

	constructor(source: FibChannel, vertical: boolean) {
		this._source = source;
		this._vertical = vertical;
	}

	abstract getPoints(): [Coordinate | null, Coordinate | null];

	update() {
		[this._minPoint, this._maxPoint] = this.getPoints();
	}

	renderer() {
		return new RectangleAxisPaneRenderer(
			this._minPoint,
			this._maxPoint,
			this._source._options.fillColor,
			this._vertical
		);
	}
	zOrder(): PrimitivePaneViewZOrder {
		return 'bottom';
	}
}

class FibChannelPriceAxisPaneView extends FibChannelAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const series = this._source.series;
		const y1 = series.priceToCoordinate(this._source._bounds._minPrice as number);
		const y2 = series.priceToCoordinate(this._source._bounds._maxPrice as number);
		return [y1, y2];
	}
}

class FibChannelTimeAxisPaneView extends FibChannelAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const timeScale = this._source.chart.timeScale();
		const x1 = timeScale.timeToCoordinate(this._source._bounds._minTime as Time);
		const x2 = timeScale.timeToCoordinate(this._source._bounds._maxTime as Time);
		return [x1, x2];
	}
}

abstract class FibChannelAxisView implements ISeriesPrimitiveAxisView {
	_source: FibChannel;
	_p: Point;
	_pos: Coordinate | null = null;
	constructor(source: FibChannel, p: Point) {
		this._source = source;
		this._p = p;
	}
	abstract update(): void;
	abstract text(): string;

	coordinate() {
		return this._pos ?? -1;
	}

	visible(): boolean {
		return this._source._options.showLabels;
	}

	tickVisible(): boolean {
		return this._source._options.showLabels;
	}

	textColor() {
		return this._source._options.labelTextColor;
	}
	backColor() {
		return this._source._options.labelColor;
	}
	movePoint(p: Point) {
		this._p = p;
		this.update();
	}
}

class FibChannelTimeAxisView extends FibChannelAxisView {
	update() {
		const timeScale = this._source.chart.timeScale();
		this._pos = timeScale.timeToCoordinate(this._p.time);
	}
	text() {
		return this._source._options.timeLabelFormatter(this._p.time);
	}
}

class FibChannelPriceAxisView extends FibChannelAxisView {
	update() {
		const series = this._source.series;
		this._pos = series.priceToCoordinate(this._p.price);
	}
	text() {
		return this._source._options.priceLabelFormatter(this._p.price);
	}
}


export interface FibChannelOptions {
	fillColor: string;
	previewFillColor: string;
	fibonacciLevels: number[];
	fibonacciFillColors: string[];
	fibonacciLineColors: string[];
	labelColor: string;
	labelTextColor: string;
	showLabels: boolean;
	priceLabelFormatter: (price: number) => string;
	timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: FibChannelOptions = {
	fillColor: 'rgba(200, 50, 100, 0.75)',
	previewFillColor: 'rgba(200, 50, 100, 0.25)',
	fibonacciLevels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.256],
	fibonacciFillColors: ['rgba(234, 53, 40, 0.3)', 'rgba(244, 244, 19, 0.3)', 'rgba(35, 220, 87, 0.3)', 'rgba(7, 227, 179, 0.3)', 'rgba(35, 186, 220, 0.3)', 'rgba(149, 35, 220, 0.3)'],
	fibonacciLineColors: ['rgb(234, 53, 40)', 'rgb(244, 244, 19)', 'rgb(35, 220, 87)', 'rgb(7, 227, 179)', 'rgb(35, 186, 220)', 'rgb(149, 35, 220)'],
	labelColor: 'rgba(200, 50, 100, 1)',
	labelTextColor: 'white',
	showLabels: true,
	priceLabelFormatter: (price: number) => price.toFixed(2),
	timeLabelFormatter: (time: Time) => {
		if (typeof time == 'string') return time;
		const date = isBusinessDay(time)
			? new Date(time.year, time.month, time.day)
			: new Date(time * 1000);
		return date.toLocaleDateString();
	},
};

class FibChannel extends DrawingBase<FibChannelOptions> {
	_paneViews: FibChannelPaneView[];
	_timeAxisViews: FibChannelTimeAxisView[] = [];
	_priceAxisViews: FibChannelPriceAxisView[] = [];
	_priceAxisPaneViews: FibChannelPriceAxisPaneView[];
	_timeAxisPaneViews: FibChannelTimeAxisPaneView[];

	constructor(points: Point[], options: Partial<FibChannelOptions> = {}) {
		super(points, defaultOptions, options);

		this._paneViews = [new FibChannelPaneView(this)];
		points.forEach((point) => {
			this._timeAxisViews.push(new FibChannelTimeAxisView(this, point));
			this._priceAxisViews.push(new FibChannelPriceAxisView(this, point));
		});
		this._priceAxisPaneViews = [new FibChannelPriceAxisPaneView(this, true)];
		this._timeAxisPaneViews = [new FibChannelTimeAxisPaneView(this, false)];
	}

	public override addPoint(p: Point) {
		this._updateDrawingBounds(p);
		this._points.push(p);
		this._timeAxisViews.push(new FibChannelTimeAxisView(this, p));
		this._priceAxisViews.push(new FibChannelPriceAxisView(this, p));
		this.requestUpdate();
	}

	public override updatePoint(p: Point, index: number) {
		if (index >= this._points.length || index < 0) return;

		this._points[index] = p;
		this._paneViews[0].update();
		this._priceAxisViews[index].movePoint(p);
		this._timeAxisViews[index].movePoint(p);

		this.requestUpdate();
	}

	updateAllViews() {
		this._paneViews.forEach((pw) => pw.update());
		this._timeAxisViews.forEach((pw) => pw.update());
		this._priceAxisViews.forEach((pw) => pw.update());
		this._priceAxisPaneViews.forEach((pw) => pw.update());
		this._timeAxisPaneViews.forEach((pw) => pw.update());
	}

	priceAxisViews() {
		return this._priceAxisViews;
	}

	timeAxisViews() {
		return this._timeAxisViews;
	}

	paneViews() {
		return this._paneViews;
	}

	priceAxisPaneViews() {
		return this._priceAxisPaneViews;
	}

	timeAxisPaneViews() {
		return this._timeAxisPaneViews;
	}

	applyOptions(options: Partial<FibChannelOptions>) {
		this._options = { ...this._options, ...options };
		this.requestUpdate();
	}

	hitTest(x: number, y: number): PrimitiveHoveredItem | null {
		if (this._paneViews.length > 0) {
		  return this._paneViews[0].renderer()?.hitTest(x, y) ?? null;
		}
		return null;
	}
}

class FibChannelPreview extends FibChannel {
	constructor(points: Point[], options: Partial<FibChannelOptions> = {}) {
		super(points, options);
		this._options.fillColor = this._options.previewFillColor;
	}
}

export class FibChannelDrawingTool extends DrawingToolBase<
	DrawingBase<FibChannelOptions>,
	DrawingBase<FibChannelOptions>,
	FibChannelOptions
> {
	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		options: Partial<FibChannelOptions>
	) {
		super(FibChannel, FibChannelPreview, chart, series, defaultOptions, options);
	}

	protected override _onClick(param: MouseEventParams) {
		if (!this._drawing || !param.point || !param.time || !this._series) return;
		const price = this._series.coordinateToPrice(param.point.y);
		if (price === null) {
			return;
		}

		const newPoint: Point = { time: param.time, price };
		if (this._previewDrawing == null) {
			this._addPointToCache(newPoint);
			this._addPointToCache(newPoint);
			this._addPreviewDrawing(this._pointsCache);
		} else {
			this._addPointToCache(newPoint);
			this._previewDrawing.addPoint(newPoint);
			if (this._pointsCache.length > 2) {
				this._removePreviewDrawing();
				this._addNewDrawing(this._pointsCache.slice(0, 2));
				this.stopDrawing();
			}
		}
	}
}
