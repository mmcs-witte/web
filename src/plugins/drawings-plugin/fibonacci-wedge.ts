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
	PrimitiveHoveredItem,
} from 'lightweight-charts';
import { Point as Point2D, Segment } from '@flatten-js/core';

import { Vector as Vector2D } from '@flatten-js/core';
import { DrawingBase, DrawingToolBase, RectangleAxisPaneRenderer, type Point, type ViewPoint } from './drawing-base.ts';
import { MathHelper } from './math-helper.ts';
import { CollisionHelper } from './collision-helper.ts';
import { convertViewPointToPoint2D, convertToPrice, calculateDrawingPoint } from './conversion-helper.ts';

export interface AnnulusSectorRenderInfo {
	annulusCenter: Point2D;
	radiusSmall: number;
	radiusBig: number;
	startAngle: number;
	sweepAngle: number;
}

// TODO: move this to renderer
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

// TODO: move this to renderer 
export function drawFibWedge(renderingScope: BitmapCoordinatesRenderingScope, points: Point2D[], fibonacciLevels: number[], fibonacciFillColors: string[], fibonacciLineColors: string[]) {
	if (points.length != 3) {
		return;
	}

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
		ctx.fillStyle = lineColor;
		ctx.strokeStyle = lineColor;
		ctx.font = '36px Arial';
		ctx.fillText(`${(currLevel * 100).toFixed(1)}%`, outX - 115, outY);
	}
}

class FibWedgePaneRenderer implements IPrimitivePaneRenderer {
	_points: ViewPoint[];
	_lineStyle: string;
	_fibonacciLevels: number[];
	_fibonacciFillColors: string[];
	_fibonacciLineColors: string[];

	constructor(points: ViewPoint[], fibonacciLevels: number[], fibonacciFillColors: string[], fibonacciLineColors: string[], lineStyle: string) {
		this._points = new Array<ViewPoint>(points.length);
		for (let i = 0; i < points.length; i++) {
			this._points[i] = points[i];
		}
		this._fibonacciLevels = fibonacciLevels;
		this._fibonacciFillColors = fibonacciFillColors;
		this._fibonacciLineColors = fibonacciLineColors;
		this._lineStyle = lineStyle;
	}

	draw(target: CanvasRenderingTarget2D) {
		target.useBitmapCoordinateSpace((scope) => {
			if (this._points.length < 2) {
				return;
			}

			const ctx = scope.context;

			for (let i = 0; i < this._points.length; i++) {
				this._points[i] = calculateDrawingPoint(this._points[i], scope);
			}

      const drawingPoints: Point2D[] = [];
      this._points.forEach((it) => {
        drawingPoints.push(convertViewPointToPoint2D(it));
      });

			if (this._points.length < 3) {
				ctx.beginPath();
				ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
				ctx.lineTo(drawingPoints[1].x, drawingPoints[1].y);
				ctx.strokeStyle = this._lineStyle;
				ctx.lineWidth = scope.verticalPixelRatio;
				ctx.stroke();
			} else {
				const points: Point2D[] = [
          convertViewPointToPoint2D(this._points[0]),
          convertViewPointToPoint2D(this._points[1]),
          convertViewPointToPoint2D(this._points[2]),
				];

				drawFibWedge(scope, points, this._fibonacciLevels, this._fibonacciFillColors, this._fibonacciLineColors);
			}
		});
	}

	hitTest(x: number, y: number): PrimitiveHoveredItem | null {
		if (this._points.length < 3) {
			return null;
		}

    const drawingPoints: Point2D[] = [];
    this._points.forEach((it) => {
      drawingPoints.push(convertViewPointToPoint2D(it));
    });

		const tolerance: number = 3e-0;

		const hitTestPoint: Point2D = new Point2D(x, y);
		const center: Vector2D = new Vector2D(drawingPoints[0].x, drawingPoints[0].y);
		const r1: Vector2D = new Vector2D(drawingPoints[1].x, drawingPoints[1].y);
		const r2: Vector2D = new Vector2D(drawingPoints[2].x, drawingPoints[2].y);

		const radiusLine1: Segment = new Segment(new Point2D(center.x, center.y), new Point2D(r1.x, r1.y));
		const radiusLine2: Segment = new Segment(new Point2D(center.x, center.y), new Point2D(r2.x, r2.y));
		const dist1 = radiusLine1.distanceTo(hitTestPoint)[0];
		const dist2 = radiusLine2.distanceTo(hitTestPoint)[0];

		let hit: boolean = false;

		if (dist1 < tolerance || dist2 < tolerance) {
			hit = true;
		}

		const radius: number = new Point2D(r1.x, r1.y).distanceTo(new Point2D(center.x, center.y))[0];

		for (let i = 1; i < this._fibonacciLevels.length && !hit; i++) {
			const level: number = this._fibonacciLevels[i];
			const startAngleDegrees: number = MathHelper.ToDegrees(MathHelper.AngleBetweenVectors(new Vector2D(1.0, 0.0), r1.subtract(center)));
			const sweepClockwiseAngleDegrees: number = MathHelper.ToDegrees(MathHelper.AngleBetweenVectors(r1.subtract(center), r2.subtract(center)));
			hit = CollisionHelper.HitTestArc(hitTestPoint, new Point2D(center.x, center.y), radius * level, startAngleDegrees, sweepClockwiseAngleDegrees, tolerance);
		}

		if (hit) {
			return {
				cursorStyle: "grab",
				externalId: 'fib-wedge-drawing',
				zOrder: 'top',
			};
		} else {
			return null;
		}
	}
}

class FibWedgePaneView implements IPrimitivePaneView {
	_source: FibWedge;
	_points: Point[];
	_drawingPoints: ViewPoint[];

	constructor(source: FibWedge) {
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
		return new FibWedgePaneRenderer(
			this._drawingPoints,
			this._source._options.fibonacciLevels,
			this._source._options.fibonacciFillColors,
			this._source._options.fibonacciLineColors,
			this._source._options.lineStyle,
		);
	}
}

abstract class FibWedgeAxisPaneView implements IPrimitivePaneView {
	_source: FibWedge;
	_minPoint: number | null = null;
	_maxPoint: number | null = null;
	_vertical: boolean = false;

	constructor(source: FibWedge, vertical: boolean) {
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

class FibWedgePriceAxisPaneView extends FibWedgeAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const series = this._source.series;
		const y1 = series.priceToCoordinate(convertToPrice(this._source._bounds._minPrice));
		const y2 = series.priceToCoordinate(convertToPrice(this._source._bounds._maxPrice));
		return [y1, y2];
	}
}

class FibWedgeTimeAxisPaneView extends FibWedgeAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const timeScale = this._source.chart.timeScale();
		const x1 = timeScale.timeToCoordinate(this._source._bounds._minTime as Time);
		const x2 = timeScale.timeToCoordinate(this._source._bounds._maxTime as Time);
		return [x1, x2];
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
	lineStyle: string;
	fibonacciLevels: number[];
	fibonacciFillColors: string[];
	fibonacciLineColors: string[];
	fillColor: string;
	previewFillColor: string;
	labelColor: string;
	labelTextColor: string;
	showLabels: boolean;
	priceLabelFormatter: (price: number) => string;
	timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: FibWedgeOptions = {
	lineStyle: 'rgb(149, 35, 220)',
	fibonacciLevels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.256],
	fibonacciFillColors: ['rgba(234, 53, 40, 0.3)', 'rgba(244, 244, 19, 0.3)', 'rgba(35, 220, 87, 0.3)', 'rgba(7, 227, 179, 0.3)', 'rgba(35, 186, 220, 0.3)', 'rgba(149, 35, 220, 0.3)'],
	fibonacciLineColors: ['rgb(234, 53, 40)', 'rgb(244, 244, 19)', 'rgb(35, 220, 87)', 'rgb(7, 227, 179)', 'rgb(35, 186, 220)', 'rgb(149, 35, 220)'],
	fillColor: 'rgba(234, 19, 19, 0.9)',
	previewFillColor: 'rgba(234, 19, 19, 0.48)',
	labelColor: 'rgba(234, 19, 19, 0.77)',
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

class FibWedge extends DrawingBase<FibWedgeOptions> {
	_paneViews: FibWedgePaneView[];
	_timeAxisViews: FibWedgeTimeAxisView[] = [];
	_priceAxisViews: FibWedgePriceAxisView[] = [];
	_priceAxisPaneViews: FibWedgePriceAxisPaneView[];
	_timeAxisPaneViews: FibWedgeTimeAxisPaneView[];

	constructor(
		points: Point[],
		options: Partial<FibWedgeOptions> = {}
	) {
		super(points, defaultOptions, options);

		this._paneViews = [new FibWedgePaneView(this)];
		points.forEach(point => {
			this._timeAxisViews.push(new FibWedgeTimeAxisView(this, point));
			this._priceAxisViews.push(new FibWedgePriceAxisView(this, point));
		});
		this._priceAxisPaneViews = [new FibWedgePriceAxisPaneView(this, true)];
		this._timeAxisPaneViews = [new FibWedgeTimeAxisPaneView(this, false)];
	}

	public override addPoint(p: Point) {
		this._updateDrawingBounds(p);
		this._points.push(p);
		this._timeAxisViews.push(new FibWedgeTimeAxisView(this, p));
		this._priceAxisViews.push(new FibWedgePriceAxisView(this, p));
		this.requestUpdate();
	}

	public override updatePoint(p: Point, index: number) {
		if (index >= this._points.length || index < 0)
			return;

		this._points[index] = p;
		this._paneViews[0].update();
		this._priceAxisViews[index].movePoint(p);
		this._timeAxisViews[index].movePoint(p);

		this.requestUpdate();
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

	hitTest(x: number, y: number): PrimitiveHoveredItem | null {
		if (this._paneViews.length > 0) {
			return this._paneViews[0].renderer()?.hitTest(x, y) ?? null;
		}
		return null;
	}
}

class FibWedgePreview extends FibWedge {
	constructor(
		points: Point[],
		options: Partial<FibWedgeOptions> = {}
	) {
		super(points, options);
		this._options.fillColor = this._options.previewFillColor;
	}
}

export class FibWedgeDrawingTool extends DrawingToolBase<
	DrawingBase<FibWedgeOptions>,
	DrawingBase<FibWedgeOptions>,
	FibWedgeOptions> {
	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		options: Partial<FibWedgeOptions>
	) {
		super(FibWedge, FibWedgePreview, chart, series, defaultOptions, options);
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
			if (this._pointsCache.length > 3) {
				this._removePreviewDrawing();
				this._addNewDrawing(this._pointsCache.slice(0, 3));
				this.stopDrawing();
			}
		}
	}
}

