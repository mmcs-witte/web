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
	PrimitivePaneViewZOrder,
	MouseEventParams,
	SeriesType,
	Time,
	PrimitiveHoveredItem,
} from 'lightweight-charts';
import { Point as Point2D } from '@flatten-js/core';
import { Vector as Vector2D } from '@flatten-js/core';
import { Segment } from '@flatten-js/core';
import { DrawingToolBase, DrawingBase, RectangleAxisPaneRenderer, type Point, type ViewPoint } from './drawing-base.ts';
import { calculateDrawingPoint, convertToPrice, convertViewPointToPoint2D } from './conversion-helper.ts';

export interface ClassicArrowRenderInfo {
	arrowWing1: Point2D;
	arrowBase: Point2D;
	arrowWing2: Point2D;
}

export function CalculateClassicArrowRenderInfo(lineStart: Point2D, lineEnd: Point2D): ClassicArrowRenderInfo {
	const p0: Vector2D = new Vector2D(lineStart.x, lineStart.y);
	const p1: Vector2D = new Vector2D(lineEnd.x, lineEnd.y);

	let lineDirectionVec = p1.subtract(p0);
	let linePerpendicularVec = new Vector2D(-lineDirectionVec.y, lineDirectionVec.x);

	linePerpendicularVec = linePerpendicularVec.normalize();
	lineDirectionVec = lineDirectionVec.normalize();

	const defaultArrowLength: number = 35.0;

	linePerpendicularVec.x *= defaultArrowLength / Math.sqrt(3.0);
	linePerpendicularVec.y *= defaultArrowLength / Math.sqrt(3.0);

	lineDirectionVec.x *= -defaultArrowLength;
	lineDirectionVec.y *= -defaultArrowLength;

	const arrowWing1 = p1.add(lineDirectionVec.add(linePerpendicularVec));
	const arrowBase = p1;
	const arrowWing2 = p1.add(lineDirectionVec.subtract(linePerpendicularVec));

	return {
		arrowWing1: new Point2D(arrowWing1.x, arrowWing1.y),
		arrowBase: new Point2D(arrowBase.x, arrowBase.y),
		arrowWing2: new Point2D(arrowWing2.x, arrowWing2.y),
	};
}

class PolylinePaneRenderer implements IPrimitivePaneRenderer {
	_points: ViewPoint[];
	_fillColor: string;

	constructor(points: ViewPoint[], fillColor: string) {
		this._points = new Array<ViewPoint>(points.length);
		for (let i = 0; i < points.length; i++) {
			this._points[i] = points[i];
		}
		this._fillColor = fillColor;
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

      const drawingPoints: Point2D[] = [];
      this._points.forEach((it) => {
        drawingPoints.push(convertViewPointToPoint2D(it));
      });

			ctx.beginPath();
			ctx.lineWidth = 5;
			ctx.strokeStyle = this._fillColor;
			ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
			for (let i = 1; i < this._points.length; i++) {
				ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y);
			}
			ctx.stroke();

			// drawing arrow
			// const n = this._points.length;
			// const p0: Point2D = new Point2D(this._points[n - 2].x, this._points[n - 2].y);
			// const p1: Point2D = new Point2D(this._points[n - 1].x, this._points[n - 1].y);
			// const arrowRenderInfo = CalculateClassicArrowRenderInfo(p0, p1);

			// ctx.beginPath();
			// ctx.moveTo(arrowRenderInfo.arrowWing2.x, arrowRenderInfo.arrowWing2.y);
			// ctx.lineTo(arrowRenderInfo.arrowBase.x, arrowRenderInfo.arrowBase.y);
			// ctx.lineTo(arrowRenderInfo.arrowWing1.x, arrowRenderInfo.arrowWing1.y);
			// ctx.stroke();
		});
	}

	hitTest(x: number, y: number): PrimitiveHoveredItem | null {
		if (this._points.length < 2) {
			return null;
		}

		let minDist = Infinity;
		const epsilon: number = 3e-0;
		for (let i = 1; i < this._points.length; i++) {
			const s0: Point2D = convertViewPointToPoint2D(this._points[i]);
			const s1: Point2D = convertViewPointToPoint2D(this._points[i - 1]);
			const segment: Segment = new Segment(s0, s1);
			minDist = Math.min(segment.distanceTo(new Point2D(x, y))[0], minDist);
		}

		if (minDist > epsilon) {
			return null;
		}

		return {
			cursorStyle: "grab",
			externalId: 'polyline-drawing',
			zOrder: 'top',
		};
	}
}


class PolylinePaneView implements IPrimitivePaneView {
	_source: Polyline;
	_points: Point[];
	_drawingPoints: ViewPoint[];

	constructor(source: Polyline) {
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
		return new PolylinePaneRenderer(
			this._drawingPoints,
			this._source._options.fillColor);
	}
}

abstract class PolylineAxisPaneView implements IPrimitivePaneView {
	_source: Polyline;
	_minPoint: number | null = null;
	_maxPoint: number | null = null;
	_vertical: boolean = false;

	constructor(source: Polyline, vertical: boolean) {
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

class PolylinePriceAxisPaneView extends PolylineAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const series = this._source.series;
		const y1 = series.priceToCoordinate(convertToPrice(this._source._bounds._minPrice));
		const y2 = series.priceToCoordinate(convertToPrice(this._source._bounds._maxPrice));
		return [y1, y2];
	}
}

class PolylineTimeAxisPaneView extends PolylineAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const timeScale = this._source.chart.timeScale();
		const x1 = timeScale.timeToCoordinate(this._source._bounds._minTime as Time);
		const x2 = timeScale.timeToCoordinate(this._source._bounds._maxTime as Time);
		return [x1, x2];
	}
}

abstract class PolylineAxisView implements ISeriesPrimitiveAxisView {
	_source: Polyline;
	_p: Point;
	_pos: Coordinate | null = null;
	constructor(source: Polyline) {
		this._source = source;
		this._p = source._points.length > 0
			? source._points[source._points.length - 1]
			: { time: 0, price: 0 } as Point;
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

class PolylineTimeAxisView extends PolylineAxisView {
	update() {
		const timeScale = this._source.chart.timeScale();
		this._pos = timeScale.timeToCoordinate(this._p.time);
	}
	text() {
		return this._source._options.timeLabelFormatter(this._p.time);
	}
}

class PolylinePriceAxisView extends PolylineAxisView {
	update() {
		const series = this._source.series;
		this._pos = series.priceToCoordinate(this._p.price);
	}
	text() {
		return this._source._options.priceLabelFormatter(this._p.price);
	}
}

export interface PolylineDrawingToolOptions {
	fillColor: string;
	previewFillColor: string;
	labelColor: string;
	labelTextColor: string;
	showLabels: boolean;
	priceLabelFormatter: (price: number) => string;
	timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: PolylineDrawingToolOptions = {
	fillColor: 'rgb(255, 106, 0)',
	previewFillColor: 'rgb(234, 83, 19)',
	labelColor: 'rgb(19, 180, 234)',
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

class Polyline extends DrawingBase<PolylineDrawingToolOptions> {
	_paneViews: PolylinePaneView[];
	_timeAxisViews: PolylineTimeAxisView[];
	_priceAxisViews: PolylinePriceAxisView[];

	_priceAxisPaneViews: PolylinePriceAxisPaneView[];
	_timeAxisPaneViews: PolylineTimeAxisPaneView[];

	constructor(
		points: Point[],
		options: Partial<PolylineDrawingToolOptions> = {}
	) {
		super(points, defaultOptions, options);
		this._paneViews = [new PolylinePaneView(this)];
		this._timeAxisViews = [new PolylineTimeAxisView(this)];
		this._priceAxisViews = [new PolylinePriceAxisView(this)];

		this._priceAxisPaneViews = [new PolylinePriceAxisPaneView(this, true)];
		this._timeAxisPaneViews = [new PolylineTimeAxisPaneView(this, false)];
	}
	
	public override updatePoint(p: Point, index: number) {
		if (index >= this._points.length || index < 0)
			return;

		this._points[index] = p;
		this._paneViews[0].update();
		this._timeAxisViews[0].movePoint(p);
		this._priceAxisViews[0].movePoint(p);

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

	applyOptions(options: Partial<PolylineDrawingToolOptions>) {
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

class PreviewPolyline extends Polyline {
	constructor(
		points: Point[],
		options: Partial<PolylineDrawingToolOptions> = {}
	) {
		super(points, options);
		this._options.fillColor = this._options.previewFillColor;
	}
}

export class PolylineDrawingTool extends DrawingToolBase<
	DrawingBase<PolylineDrawingToolOptions>,
	DrawingBase<PolylineDrawingToolOptions>,
	PolylineDrawingToolOptions> {
	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		options: Partial<PolylineDrawingToolOptions>
	) {
		super(Polyline, PreviewPolyline, chart, series, defaultOptions, options);
	}

	protected override _onDblClick(param: MouseEventParams) {
		if (!this._drawing || !param.point || !param.time || !this._series) return;
		const price = this._series.coordinateToPrice(param.point.y);
		if (price === null) {
			return;
		}

		const newPoint: Point = { time: param.time, price };
		this._getCachedPoints()[this._getCachedPoints().length - 1] = newPoint;
		this._removePreviewDrawing();
		this._addNewDrawing(this._pointsCache);
		this.stopDrawing();
	}
}
