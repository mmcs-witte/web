import type { CanvasRenderingTarget2D } from 'fancy-canvas';

import {
	isBusinessDay
} from 'lightweight-charts';
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
import { ensureDefined } from '../../helpers/assertions.ts';
import { ChartInstrumentBase } from '../chart-instrument-base.ts';
import { positionsBox } from '../../helpers/dimensions/positions.ts';
import type { Point, ViewPoint } from './drawing-base.ts';

class TrianglePaneRenderer implements IPrimitivePaneRenderer {
	_points: ViewPoint[];
	_fillColor: string;

	constructor(points: ViewPoint[], fillColor: string) {
		this._points = points;
		this._fillColor = fillColor;
	}

	draw(target: CanvasRenderingTarget2D) {
		target.useBitmapCoordinateSpace(scope => {
			if (this._points.length < 2) {
				return;
			}

			const ctx = scope.context;

			const calculateDrawingPoint = (point: ViewPoint): ViewPoint => {
				return {
					x: Math.round(point.x * scope.horizontalPixelRatio),
					y: Math.round(point.y * scope.verticalPixelRatio)
				};
			};

			const drawingPoint1: ViewPoint = calculateDrawingPoint(this._points[0]);
			const drawingPoint2: ViewPoint = calculateDrawingPoint(this._points[1]);
			const drawingPoint3: ViewPoint = this._points.length > 2 ?
				calculateDrawingPoint(this._points[2]) :
				drawingPoint2;

			if (this._points.length < 3) {
				ctx.beginPath();
				ctx.moveTo(drawingPoint1.x, drawingPoint1.y);
				ctx.lineTo(drawingPoint2.x, drawingPoint2.y);
				ctx.strokeStyle = this._fillColor;
				ctx.lineWidth = scope.verticalPixelRatio;
				ctx.stroke();
			}
			else {
				ctx.fillStyle = this._fillColor;
				ctx.beginPath();
				ctx.moveTo(drawingPoint1.x, drawingPoint1.y);
				ctx.lineTo(drawingPoint2.x, drawingPoint2.y);
				ctx.lineTo(drawingPoint3.x, drawingPoint3.y);
				ctx.fill();
			}
		});
	}
}

class TrianglePaneView implements IPrimitivePaneView {
	_source: Triangle;
	_p1: ViewPoint = { x: null, y: null };
	_p2: ViewPoint = { x: null, y: null };
	_p3: ViewPoint = { x: null, y: null };

	constructor(source: Triangle) {
		this._source = source;
	}

	update() {
		const series = this._source.series;
		const y1 = this._source._p1.price ? series.priceToCoordinate(this._source._p1.price) : this._source._p1.price;
		const y2 = this._source._p2.price ? series.priceToCoordinate(this._source._p2.price) : this._source._p2.price
		const y3 = this._source._p3.price ? series.priceToCoordinate(this._source._p3.price) : this._source._p3.price;
		const timeScale = this._source.chart.timeScale();
		const x1 = this._source._p1.time ? timeScale.timeToCoordinate(this._source._p1.time) : this._source._p1.time;
		const x2 = this._source._p2.time ? timeScale.timeToCoordinate(this._source._p2.time) : this._source._p2.time;
		const x3 = this._source._p3.time ? timeScale.timeToCoordinate(this._source._p3.time) : this._source._p3.time;

		this._p1 = { x: x1, y: y1 };
		this._p2 = { x: x2, y: y2 };
		this._p3 = { x: x3, y: y3 };
	}

	renderer() {
		const n: number = this._source._numPointsToUse;
		const points: ViewPoint[] = [];
		for (let i: number = 0; i < n; i++) {
			points.push(i == 0 ? this._p1 : i == 1 ? this._p2 : this._p3);
		}
		return new TrianglePaneRenderer(
			points,
			this._source._options.fillColor
		);
	}
}

class TriangleAxisPaneRenderer implements IPrimitivePaneRenderer {
	_p1: number | null;
	_p2: number | null;
	_p3: number | null;
	_fillColor: string;
	_vertical: boolean = false;

	constructor(
		p1: number | null,
		p2: number | null,
		p3: number | null,
		fillColor: string,
		vertical: boolean
	) {
		this._p1 = p1;
		this._p2 = p2;
		this._p3 = p3;
		this._fillColor = fillColor;
		this._vertical = vertical;
	}

	draw(target: CanvasRenderingTarget2D) {
		target.useBitmapCoordinateSpace(scope => {
			if (this._p1 === null || this._p2 === null || this._p3 === null) return;
			const ctx = scope.context;
			ctx.globalAlpha = 0.5;

			const posStart: number = Math.min(this._p1, Math.min(this._p2, this._p3));
			const posEnd: number = Math.max(this._p1, Math.max(this._p2, this._p3));
			const positions = positionsBox(
				posStart,
				posEnd,
				this._vertical ? scope.verticalPixelRatio : scope.horizontalPixelRatio
			);

			ctx.fillStyle = this._fillColor;
			if (this._vertical) {
				ctx.fillRect(0, positions.position, 15, positions.length);
			} else {
				ctx.fillRect(positions.position, 0, positions.length, 15);
			}
		});
	}
}

abstract class TriangleAxisPaneView implements IPrimitivePaneView {
	_source: Triangle;
	_p1: number | null = null;
	_p2: number | null = null;
	_p3: number | null = null;
	_vertical: boolean = false;

	constructor(source: Triangle, vertical: boolean) {
		this._source = source;
		this._vertical = vertical;
	}

	abstract getPoints(): [Coordinate | null, Coordinate | null, Coordinate | null];

	update() {
		[this._p1, this._p2, this._p3] = this.getPoints();
	}

	renderer() {
		return new TriangleAxisPaneRenderer(
			this._p1,
			this._p2,
			this._p3,
			this._source._options.fillColor,
			this._vertical
		);
	}
	zOrder(): PrimitivePaneViewZOrder {
		return 'bottom';
	}
}

class TrianglePriceAxisPaneView extends TriangleAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null, Coordinate | null] {
		const series = this._source.series;
		const y1 = series.priceToCoordinate(this._source._p1.price);
		const y2 = series.priceToCoordinate(this._source._p2.price);
		const y3 = series.priceToCoordinate(this._source._p3.price);
		return [y1, y2, y3];
	}
}

class TriangleTimeAxisPaneView extends TriangleAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null, Coordinate | null] {
		const timeScale = this._source.chart.timeScale();
		const x1 = timeScale.timeToCoordinate(this._source._p1.time);
		const x2 = timeScale.timeToCoordinate(this._source._p2.time);
		const x3 = timeScale.timeToCoordinate(this._source._p3.time);
		return [x1, x2, x3];
	}
}

abstract class TriangleAxisView implements ISeriesPrimitiveAxisView {
	_source: Triangle;
	_p: Point;
	_pos: Coordinate | null = null;
	constructor(source: Triangle, p: Point) {
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

class TriangleTimeAxisView extends TriangleAxisView {
	update() {
		const timeScale = this._source.chart.timeScale();
		this._pos = timeScale.timeToCoordinate(this._p.time);
	}
	text() {
		return this._source._options.timeLabelFormatter(this._p.time);
	}
}

class TrianglePriceAxisView extends TriangleAxisView {
	update() {
		const series = this._source.series;
		this._pos = series.priceToCoordinate(this._p.price);
	}
	text() {
		return this._source._options.priceLabelFormatter(this._p.price);
	}
}


export interface TriangleDrawingToolOptions {
	fillColor: string;
	previewFillColor: string;
	labelColor: string;
	labelTextColor: string;
	showLabels: boolean;
	priceLabelFormatter: (price: number) => string;
	timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: TriangleDrawingToolOptions = {
	fillColor: 'rgba(234, 116, 19, 0.61)',
	previewFillColor: 'rgba(234, 116, 19, 0.36)',
	labelColor: 'rgba(234, 116, 19, 0.74)',
	labelTextColor: 'white',
	showLabels: true,
	priceLabelFormatter: (price: number) => price.toFixed(3), // => price.toFixed(2),
	timeLabelFormatter: (time: Time) => {
		if (typeof time == 'string') return time;
		const date = isBusinessDay(time)
			? new Date(time.year, time.month, time.day)
			: new Date(time * 1000);
		return date.toLocaleDateString();
	},
};

class Triangle extends ChartInstrumentBase {
	_options: TriangleDrawingToolOptions;
	_p1: Point;
	_p2: Point;
	_p3: Point;
	_paneViews: TrianglePaneView[];
	_timeAxisViews: TriangleTimeAxisView[];
	_priceAxisViews: TrianglePriceAxisView[];
	_priceAxisPaneViews: TrianglePriceAxisPaneView[];
	_timeAxisPaneViews: TriangleTimeAxisPaneView[];
	_numPointsToUse: number;

	constructor(
		points: Point[],
		options: Partial<TriangleDrawingToolOptions> = {}
	) {
		super();
		if (points.length == 0) {
			this._p1 = { time: 0, price: 0 };
			this._p2 = this._p1;
			this._p3 = this._p1;
			this._numPointsToUse = 2;
		} else {
			this._p1 = points[0];
			this._p2 = points.length >= 2 ? points[1] : points[0];
			this._p3 = points.length >= 3 ? points[2] : points[0];
			this._numPointsToUse = Math.min(points.length + 1, 3);
		}
		this._options = {
			...defaultOptions,
			...options,
		};
		this._paneViews = [new TrianglePaneView(this)];
		this._timeAxisViews = [
			new TriangleTimeAxisView(this, this._p1),
			new TriangleTimeAxisView(this, this._p2),
			new TriangleTimeAxisView(this, this._p3),
		];
		this._priceAxisViews = [
			new TrianglePriceAxisView(this, this._p1),
			new TrianglePriceAxisView(this, this._p2),
			new TrianglePriceAxisView(this, this._p3),
		];
		this._priceAxisPaneViews = [new TrianglePriceAxisPaneView(this, true)];
		this._timeAxisPaneViews = [new TriangleTimeAxisPaneView(this, false)];
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

	applyOptions(options: Partial<TriangleDrawingToolOptions>) {
		this._options = { ...this._options, ...options };
		this.requestUpdate();
	}
}

class PreviewTriangle extends Triangle {
	constructor(
		points: Point[],
		options: Partial<TriangleDrawingToolOptions> = {}
	) {
		super(points, options);
		this._options.fillColor = this._options.previewFillColor;
	}

	public updateDrawingPoint(p: Point, pointIndexToUpdate: number) {
		pointIndexToUpdate = Math.min(Math.max(0, pointIndexToUpdate), 3);

		switch (pointIndexToUpdate) {
			case 1:
				this._p2 = p;
				this._numPointsToUse = 2;
				break;
			case 2:
				this._p3 = p;
				this._numPointsToUse = 3;
				break;
		}

		this._paneViews[0].update();
		this._timeAxisViews[pointIndexToUpdate].movePoint(p);
		this._priceAxisViews[pointIndexToUpdate].movePoint(p);

		this.requestUpdate();
	}
}

export class TriangleDrawingTool {
	private _chart: IChartApi | undefined;
	private _series: ISeriesApi<SeriesType> | undefined;
	private _defaultOptions: Partial<TriangleDrawingToolOptions>;
	private _drawings: Triangle[];
	private _previewDrawing: PreviewTriangle | undefined = undefined;
	private _points: Point[] = [];
	private _drawing: boolean = false;

	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		options: Partial<TriangleDrawingToolOptions>
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
		this._drawings.forEach(triangle => {
			this._removeDrawing(triangle);
		});
		this._drawings = [];
		this._removePreviewDrawing();
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
			price
		});
	}

	private _onMouseMove(param: MouseEventParams) {
		if (!this._drawing || !param.point || !param.time || !this._series) return;
		const price = this._series.coordinateToPrice(param.point.y);
		if (price === null) {
			return;
		}

		const numPoints: number = this._points.length;

		if (this._previewDrawing) {
			this._previewDrawing.updateDrawingPoint(
				{
					time: param.time,
					price,
				},
				numPoints);
		}
	}

	private _addPoint(p: Point) {
		this._points.push(p);
		if (this._points.length > 2) {
			this._addNewDrawing(this._points[0], this._points[1], this._points[2]);
			this.stopDrawing();
			this._removePreviewDrawing();
		}
		if (this._points.length === 1) {
			this._addPreviewDrawing(this._points[0]);
		}
	}

	private _addNewDrawing(p1: Point, p2: Point, p3: Point) {
		const drawing = new Triangle([p1, p2, p3], { ...this._defaultOptions });
		this._drawings.push(drawing);
		ensureDefined(this._series).attachPrimitive(drawing);
	}

	private _removeDrawing(drawing: Triangle) {
		ensureDefined(this._series).detachPrimitive(drawing);
	}

	private _addPreviewDrawing(p: Point) {
		this._previewDrawing = new PreviewTriangle([p], {
			...this._defaultOptions,
		});
		ensureDefined(this._series).attachPrimitive(this._previewDrawing);
	}

	private _removePreviewDrawing() {
		if (this._previewDrawing) {
			ensureDefined(this._series).detachPrimitive(this._previewDrawing);
			this._previewDrawing = undefined;
		}
	}
}
