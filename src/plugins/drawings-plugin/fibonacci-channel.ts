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
} from 'lightweight-charts';

import {
	isBusinessDay
} from 'lightweight-charts';

import { ensureDefined } from '../../helpers/assertions.ts';
import { PluginBase } from '../plugin-base.ts';
import { positionsBox } from '../../helpers/dimensions/positions.ts';
import { RectangleAxisPaneRenderer, type Point, type ViewPoint } from './drawing-base.ts';

class FibChannelPaneRenderer implements IPrimitivePaneRenderer {
	_p1: ViewPoint;
	_p2: ViewPoint;
	_fillColor: string;

	constructor(p1: ViewPoint, p2: ViewPoint, fillColor: string) {
		this._p1 = p1;
		this._p2 = p2;
		this._fillColor = fillColor;
	}
	draw(target: CanvasRenderingTarget2D) {
		target.useBitmapCoordinateSpace(scope => {
			if (
				this._p1.x === null ||
				this._p1.y === null ||
				this._p2.x === null ||
				this._p2.y === null
			)
				return;

			const ctx = scope.context;

			const calculateDrawingPoint = (point: ViewPoint): ViewPoint => {
				return {
					x: Math.round(point.x * scope.horizontalPixelRatio),
					y: Math.round(point.y * scope.verticalPixelRatio)
				};
			};

			const drawingPoint1: ViewPoint = calculateDrawingPoint({ x: this._p1.x, y: this._p1.y });
			const drawingPoint2: ViewPoint = calculateDrawingPoint({ x: this._p2.x, y: this._p2.y });

			const high = Math.min(drawingPoint1.y, drawingPoint2.y);
			const low = Math.max(drawingPoint1.y, drawingPoint2.y);
			const height = low - high;

			ctx.font = '36px Arial';

			const fibonacciLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
			const fibonacciLineColors = ['rgba(234, 53, 40, 0.93)', 'rgba(244, 244, 19, 0.94)', 'rgba(35, 220, 87, 0.75)',
				'rgba(7, 227, 179, 0.75)', 'rgba(35, 186, 220, 0.75)', 'rgba(149, 35, 220, 0.75)'];

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
					const currY = low - height * curLevel;
					const nextY = low - height * nextLevel;

					ctx.beginPath();
					ctx.moveTo(drawingPoint1.x, currY);
					ctx.lineTo(drawingPoint2.x, currY);
					ctx.lineTo(drawingPoint2.x, nextY);
					ctx.lineTo(drawingPoint1.x, nextY);
					ctx.fill();
				}
			}

			ctx.globalAlpha = oldGlobalAlpha;

			for (let i: number = 0; i < fibonacciLevels.length; i++) {
				ctx.strokeStyle = fibonacciLineColors[i % fibonacciLineColors.length];
				ctx.fillStyle = fibonacciLineColors[i % fibonacciLineColors.length];
				ctx.lineWidth = 5;

				const level = fibonacciLevels[i];
				const y = low - height * level;
				ctx.beginPath();
				ctx.moveTo(drawingPoint1.x, y);
				ctx.lineTo(drawingPoint2.x, y);
				ctx.stroke();
				ctx.fillText(`${(level * 100).toFixed(1)}%`, (drawingPoint2.x + 4), (y - 2));
			}
		});
	}
}

class FibChannelPaneView implements IPrimitivePaneView {
	_source: FibChannel;
	_p1: ViewPoint = { x: null, y: null };
	_p2: ViewPoint = { x: null, y: null };

	constructor(source: FibChannel) {
		this._source = source;
	}

	update() {
		const series = this._source.series;
		const y1 = series.priceToCoordinate(this._source._p1.price);
		const y2 = series.priceToCoordinate(this._source._p2.price);
		const timeScale = this._source.chart.timeScale();
		const x1 = timeScale.timeToCoordinate(this._source._p1.time);
		const x2 = timeScale.timeToCoordinate(this._source._p2.time);
		this._p1 = { x: x1, y: y1 };
		this._p2 = { x: x2, y: y2 };
	}

	renderer() {
		return new FibChannelPaneRenderer(
			this._p1,
			this._p2,
			this._source._options.fillColor
		);
	}
}

abstract class RectangleAxisPaneView implements IPrimitivePaneView {
	_source: FibChannel;
	_p1: number | null = null;
	_p2: number | null = null;
	_vertical: boolean = false;

	constructor(source: FibChannel, vertical: boolean) {
		this._source = source;
		this._vertical = vertical;
	}

	abstract getPoints(): [Coordinate | null, Coordinate | null];

	update() {
		[this._p1, this._p2] = this.getPoints();
	}

	renderer() {
		return new RectangleAxisPaneRenderer(
			this._p1,
			this._p2,
			this._source._options.fillColor,
			this._vertical
		);
	}
	zOrder(): PrimitivePaneViewZOrder {
		return 'bottom';
	}
}

class RectanglePriceAxisPaneView extends RectangleAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const series = this._source.series;
		const y1 = series.priceToCoordinate(this._source._p1.price);
		const y2 = series.priceToCoordinate(this._source._p2.price);
		return [y1, y2];
	}
}

class RectangleTimeAxisPaneView extends RectangleAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const timeScale = this._source.chart.timeScale();
		const x1 = timeScale.timeToCoordinate(this._source._p1.time);
		const x2 = timeScale.timeToCoordinate(this._source._p2.time);
		return [x1, x2];
	}
}

abstract class RectangleAxisView implements ISeriesPrimitiveAxisView {
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

class RectangleTimeAxisView extends RectangleAxisView {
	update() {
		const timeScale = this._source.chart.timeScale();
		this._pos = timeScale.timeToCoordinate(this._p.time);
	}
	text() {
		return this._source._options.timeLabelFormatter(this._p.time);
	}
}

class RectanglePriceAxisView extends RectangleAxisView {
	update() {
		const series = this._source.series;
		this._pos = series.priceToCoordinate(this._p.price);
	}
	text() {
		return this._source._options.priceLabelFormatter(this._p.price);
	}
}


export interface FibChannelDrawingToolOptions {
	fillColor: string;
	previewFillColor: string;
	labelColor: string;
	labelTextColor: string;
	showLabels: boolean;
	priceLabelFormatter: (price: number) => string;
	timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: FibChannelDrawingToolOptions = {
	fillColor: 'rgba(200, 50, 100, 0.75)',
	previewFillColor: 'rgba(200, 50, 100, 0.25)',
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

class FibChannel extends PluginBase {
	_options: FibChannelDrawingToolOptions;
	_p1: Point;
	_p2: Point;
	_paneViews: FibChannelPaneView[];
	_timeAxisViews: RectangleTimeAxisView[];
	_priceAxisViews: RectanglePriceAxisView[];
	_priceAxisPaneViews: RectanglePriceAxisPaneView[];
	_timeAxisPaneViews: RectangleTimeAxisPaneView[];

	constructor(
		p1: Point,
		p2: Point,
		options: Partial<FibChannelDrawingToolOptions> = {}
	) {
		super();
		this._p1 = p1;
		this._p2 = p2;
		this._options = {
			...defaultOptions,
			...options,
		};
		this._paneViews = [new FibChannelPaneView(this)];
		this._timeAxisViews = [
			new RectangleTimeAxisView(this, p1),
			new RectangleTimeAxisView(this, p2),
		];
		this._priceAxisViews = [
			new RectanglePriceAxisView(this, p1),
			new RectanglePriceAxisView(this, p2),
		];
		this._priceAxisPaneViews = [new RectanglePriceAxisPaneView(this, true)];
		this._timeAxisPaneViews = [new RectangleTimeAxisPaneView(this, false)];
	}

	updateAllViews() {
		this._paneViews.forEach(pw => pw.update());
		this._timeAxisViews.forEach(pw => pw.update());
		this._priceAxisViews.forEach(pw => pw.update());
		this._priceAxisPaneViews.forEach(pw => pw.update());
		this._timeAxisPaneViews.forEach(pw => pw.update());
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

	applyOptions(options: Partial<FibChannelDrawingToolOptions>) {
		this._options = { ...this._options, ...options };
		this.requestUpdate();
	}
}

class PreviewFibChannel extends FibChannel {
	constructor(
		p1: Point,
		p2: Point,
		options: Partial<FibChannelDrawingToolOptions> = {}
	) {
		super(p1, p2, options);
		this._options.fillColor = this._options.previewFillColor;
	}

	public updateEndPoint(p: Point) {
		this._p2 = p;
		this._paneViews[0].update();
		this._timeAxisViews[1].movePoint(p);
		this._priceAxisViews[1].movePoint(p);
		this.requestUpdate();
	}
}

export class FibChannelDrawingTool {
	private _chart: IChartApi | undefined;
	private _series: ISeriesApi<SeriesType> | undefined;
	private _defaultOptions: Partial<FibChannelDrawingToolOptions>;
	private _drawings: FibChannel[];
	private _previewDrawing: PreviewFibChannel | undefined = undefined;
	private _points: Point[] = [];
	private _drawing: boolean = false;

	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		options: Partial<FibChannelDrawingToolOptions>
	) {
		this._chart = chart;
		this._series = series;
		this._defaultOptions = options;
		this._drawings = [];
		this._chart.subscribeClick(this._clickHandler);
		this._chart.subscribeCrosshairMove(this._moveHandler);
	}

	private _clickHandler = (param: MouseEventParams) => this._onClick(param);
	private _moveHandler = (param: MouseEventParams) => this._onMouseMove(param);

	remove() {
		this.stopDrawing();
		if (this._chart) {
			this._chart.unsubscribeClick(this._clickHandler);
			this._chart.unsubscribeCrosshairMove(this._moveHandler);
		}
		this._drawings.forEach(rectangle => {
			this._removeRectangle(rectangle);
		});
		this._drawings = [];
		this._removePreviewRectangle();
		this._chart = undefined;
		this._series = undefined;
	}

	startDrawing(): void {
		this._drawing = true;
		this._points = [];
	}

	stopDrawing(): void {
		this._drawing = false;
		this._points = [];
	}

	isDrawing(): boolean {
		return this._drawing;
	}

	private _onClick(param: MouseEventParams) {
		if (!this._drawing || !param.point || !param.time || !this._series) return;
		const price = this._series.coordinateToPrice(param.point.y);
		if (price === null) {
			return;
		}
		this._addPoint({
			time: param.time,
			price,
		});
	}

	private _onMouseMove(param: MouseEventParams) {
		if (!this._drawing || !param.point || !param.time || !this._series) return;
		const price = this._series.coordinateToPrice(param.point.y);
		if (price === null) {
			return;
		}
		if (this._previewDrawing) {
			this._previewDrawing.updateEndPoint({
				time: param.time,
				price,
			});
		}
	}

	private _addPoint(p: Point) {
		this._points.push(p);
		if (this._points.length >= 2) {
			this._addNewRectangle(this._points[0], this._points[1]);
			this.stopDrawing();
			this._removePreviewRectangle();
		}
		if (this._points.length === 1) {
			this._addPreviewRectangle(this._points[0]);
		}
	}

	private _addNewRectangle(p1: Point, p2: Point) {
		const rectangle = new FibChannel(p1, p2, { ...this._defaultOptions });
		this._drawings.push(rectangle);
		ensureDefined(this._series).attachPrimitive(rectangle);
	}

	private _removeRectangle(rectangle: FibChannel) {
		ensureDefined(this._series).detachPrimitive(rectangle);
	}

	private _addPreviewRectangle(p: Point) {
		this._previewDrawing = new PreviewFibChannel(p, p, {
			...this._defaultOptions,
		});
		ensureDefined(this._series).attachPrimitive(this._previewDrawing);
	}

	private _removePreviewRectangle() {
		if (this._previewDrawing) {
			ensureDefined(this._series).detachPrimitive(this._previewDrawing);
			this._previewDrawing = undefined;
		}
	}
}
