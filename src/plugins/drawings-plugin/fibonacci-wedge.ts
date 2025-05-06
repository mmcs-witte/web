import type { CanvasRenderingTarget2D, BitmapCoordinatesRenderingScope } from 'fancy-canvas';

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
import { PluginBase } from '../plugin-base.ts';
import { positionsBox } from '../../helpers/dimensions/positions.ts';

import { Point as Point2D } from '@flatten-js/core';
import { Vector as Vector2D } from '@flatten-js/core';
import type { Point, ViewPoint } from './drawing-base.ts';
import { MathHelper } from './math-helper.ts';

export interface AnnulusSectorRenderInfo {
	annulusCenter: Point2D;
	radiusSmall: number;
	radiusBig: number;
	startAngle: number;
	sweepAngle: number;
}

export function fillAnnulusSector(renderingScope: BitmapCoordinatesRenderingScope, annulusRenderInfo: AnnulusSectorRenderInfo, fillColor: string, lineColor: string) {
	const ctx = renderingScope.context;

	ctx.fillStyle = fillColor;

	const center = annulusRenderInfo.annulusCenter;
	const radiusSmall = annulusRenderInfo.radiusSmall;
	const radiusBig = annulusRenderInfo.radiusBig;
	const angleStart = annulusRenderInfo.startAngle;
	const angleEnd = annulusRenderInfo.startAngle + annulusRenderInfo.sweepAngle;

	const centerVec = new Vector2D(center.x, center.y);

	let r2 = new Vector2D(radiusSmall, 0);
	r2 = centerVec.add(MathHelper.RotateVector(r2, angleEnd));

	const isClockwise: boolean = annulusRenderInfo.sweepAngle < 0;

	ctx.lineWidth = 5;
	ctx.strokeStyle = lineColor;

	ctx.beginPath();
	ctx.arc(center.x, center.y, radiusBig, angleStart, angleEnd, isClockwise);
	ctx.lineTo(r2.x, r2.y);
	ctx.arc(center.x, center.y, radiusSmall, angleEnd, angleStart, !isClockwise);
	ctx.closePath();
	ctx.fill();

	ctx.beginPath();
	ctx.arc(center.x, center.y, radiusBig, angleStart, angleEnd, isClockwise);
	ctx.stroke();
}

export function drawFibWedge(renderingScope: BitmapCoordinatesRenderingScope, points: Point2D[]) {
	if (points.length != 3) {
		return;
	}

	const fibonacciLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.256];
	const fibonacciFillColors = ['rgba(234, 53, 40, 0.3)', 'rgba(244, 244, 19, 0.3)', 'rgba(35, 220, 87, 0.3)', 'rgba(7, 227, 179, 0.3)', 'rgba(35, 186, 220, 0.3)', 'rgba(149, 35, 220, 0.3)'];
	const fibonacciLineColors = ['rgb(234, 53, 40)', 'rgb(244, 244, 19)', 'rgb(35, 220, 87)', 'rgb(7, 227, 179)', 'rgb(35, 186, 220)', 'rgb(149, 35, 220)'];

	const p0 = new Vector2D(points[0].x, points[0].y);
	const p1 = new Vector2D(points[1].x, points[1].y);
	const p2 = new Vector2D(points[2].x, points[2].y);

	const trendLineVec1: Vector2D = p1.subtract(p0);
	const trendLineVec2: Vector2D = p2.subtract(p0);

	const radius = points[0].distanceTo(points[1])[0];
	const startAngle = MathHelper.AngleBetweenVectors(new Vector2D(1.0, 0.0), trendLineVec1);
	const sweepAngle = MathHelper.AngleBetweenVectors(trendLineVec1, trendLineVec2);
	const annulusCenter = points[0];

	for (let i = 1; i < fibonacciLevels.length; i++) {
		const currLevel = fibonacciLevels[i];
		const prevLevel = i == 0 ? 0.0 : fibonacciLevels[i - 1];

		const prevRadius = radius * prevLevel;
		const currRadius = radius * currLevel;

		const renderInfo: AnnulusSectorRenderInfo = {
			annulusCenter: annulusCenter,
			radiusSmall: prevRadius,
			radiusBig: currRadius,
			startAngle: startAngle,
			sweepAngle: sweepAngle,
		};

		const fillColor = fibonacciFillColors[i % fibonacciLineColors.length];
		const lineColor = fibonacciLineColors[i % fibonacciLineColors.length];
		fillAnnulusSector(renderingScope, renderInfo, fillColor, lineColor);

		// drawing label
		let angleBisectorVec: Vector2D = p1.subtract(p0);
		angleBisectorVec = MathHelper.RotateVector(angleBisectorVec, sweepAngle / 2);
		angleBisectorVec = angleBisectorVec.scale(currLevel, currLevel);

		const ctx = renderingScope.context;
		const outX: number = p0.add(angleBisectorVec).x;
		const outY: number = p0.add(angleBisectorVec).y;
		ctx.fillColor = lineColor;
		ctx.strokeStyle = lineColor;
		ctx.font = '36px Arial';
		ctx.fillText(`${(currLevel * 100).toFixed(1)}%`, outX - 115, outY);
	}
}

class FibWedgePaneRenderer implements IPrimitivePaneRenderer {
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
				const points: Point2D[] = [
					new Point2D(drawingPoint1.x, drawingPoint1.y),
					new Point2D(drawingPoint2.x, drawingPoint2.y),
					new Point2D(drawingPoint3.x, drawingPoint3.y),
				]
				drawFibWedge(scope, points);
			}
		});
	}
}

class FibWedgePaneView implements IPrimitivePaneView {
	_source: FibWedge;
	_p1: ViewPoint = { x: null, y: null };
	_p2: ViewPoint = { x: null, y: null };
	_p3: ViewPoint = { x: null, y: null };

	constructor(source: FibWedge) {
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
		return new FibWedgePaneRenderer(
			points,
			this._source._options.fillColor
		);
	}
}

class FibWedgeAxisPaneRenderer implements IPrimitivePaneRenderer {
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

abstract class FibWedgeAxisPaneView implements IPrimitivePaneView {
	_source: FibWedge;
	_p1: number | null = null;
	_p2: number | null = null;
	_p3: number | null = null;
	_vertical: boolean = false;

	constructor(source: FibWedge, vertical: boolean) {
		this._source = source;
		this._vertical = vertical;
	}

	abstract getPoints(): [Coordinate | null, Coordinate | null, Coordinate | null];

	update() {
		[this._p1, this._p2, this._p3] = this.getPoints();
	}

	renderer() {
		return new FibWedgeAxisPaneRenderer(
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

class FibWedgePriceAxisPaneView extends FibWedgeAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null, Coordinate | null] {
		const series = this._source.series;
		const y1 = series.priceToCoordinate(this._source._p1.price);
		const y2 = series.priceToCoordinate(this._source._p2.price);
		const y3 = series.priceToCoordinate(this._source._p3.price);
		return [y1, y2, y3];
	}
}

class FibWedgeTimeAxisPaneView extends FibWedgeAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null, Coordinate | null] {
		const timeScale = this._source.chart.timeScale();
		const x1 = timeScale.timeToCoordinate(this._source._p1.time);
		const x2 = timeScale.timeToCoordinate(this._source._p2.time);
		const x3 = timeScale.timeToCoordinate(this._source._p3.time);
		return [x1, x2, x3];
	}
}

abstract class FibWedgeAxisView implements ISeriesPrimitiveAxisView {
	_source: FibWedge;
	_p: Point;
	_pos: Coordinate | null = null;
	constructor(source: FibWedge, p: Point) {
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

class FibWedgeTimeAxisView extends FibWedgeAxisView {
	update() {
		const timeScale = this._source.chart.timeScale();
		this._pos = timeScale.timeToCoordinate(this._p.time);
	}
	text() {
		return this._source._options.timeLabelFormatter(this._p.time);
	}
}

class FibWedgePriceAxisView extends FibWedgeAxisView {
	update() {
		const series = this._source.series;
		this._pos = series.priceToCoordinate(this._p.price);
	}
	text() {
		return this._source._options.priceLabelFormatter(this._p.price);
	}
}

export interface FibWedgeOptions {
	fillColor: string;
	previewFillColor: string;
	labelColor: string;
	labelTextColor: string;
	showLabels: boolean;
	priceLabelFormatter: (price: number) => string;
	timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: FibWedgeOptions = {
	fillColor: 'rgb(0, 0, 0)',
	previewFillColor: 'rgb(0, 0, 0)',
	labelColor: 'rgb(0, 0, 0)',
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

class FibWedge extends PluginBase {
	_options: FibWedgeOptions;
	_p1: Point;
	_p2: Point;
	_p3: Point;
	_paneViews: FibWedgePaneView[];
	_timeAxisViews: FibWedgeTimeAxisView[];
	_priceAxisViews: FibWedgePriceAxisView[];
	_priceAxisPaneViews: FibWedgePriceAxisPaneView[];
	_timeAxisPaneViews: FibWedgeTimeAxisPaneView[];
	_numPointsToUse: number;

	constructor(
		points: Point[],
		options: Partial<FibWedgeOptions> = {}
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
		this._paneViews = [new FibWedgePaneView(this)];
		this._timeAxisViews = [
			new FibWedgeTimeAxisView(this, this._p1),
			new FibWedgeTimeAxisView(this, this._p2),
			new FibWedgeTimeAxisView(this, this._p3),
		];
		this._priceAxisViews = [
			new FibWedgePriceAxisView(this, this._p1),
			new FibWedgePriceAxisView(this, this._p2),
			new FibWedgePriceAxisView(this, this._p3),
		];
		this._priceAxisPaneViews = [new FibWedgePriceAxisPaneView(this, true)];
		this._timeAxisPaneViews = [new FibWedgeTimeAxisPaneView(this, false)];
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

	applyOptions(options: Partial<FibWedgeOptions>) {
		this._options = { ...this._options, ...options };
		this.requestUpdate();
	}
}

class PreviewFibWedge extends FibWedge {
	constructor(
		points: Point[],
		options: Partial<FibWedgeOptions> = {}
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

export class FibWedgeDrawingTool {
	private _chart: IChartApi | undefined;
	private _series: ISeriesApi<SeriesType> | undefined;
	private _defaultOptions: Partial<FibWedgeOptions>;
	private _drawings: FibWedge[];
	private _previewDrawing: PreviewFibWedge | undefined = undefined;
	private _points: Point[] = [];
	private _drawing: boolean = false;

	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		options: Partial<FibWedgeOptions>
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
		this._drawings.forEach(drawing => {
			this._removeDrawing(drawing);
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
		const drawing = new FibWedge([p1, p2, p3], { ...this._defaultOptions });
		this._drawings.push(drawing);
		ensureDefined(this._series).attachPrimitive(drawing);
	}

	private _removeDrawing(drawing: FibWedge) {
		ensureDefined(this._series).detachPrimitive(drawing);
	}

	private _addPreviewDrawing(p: Point) {
		this._previewDrawing = new PreviewFibWedge([p], {
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
