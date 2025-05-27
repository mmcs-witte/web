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
import { Point as Point2D } from '@flatten-js/core';
import { Vector as Vector2D } from '@flatten-js/core';
import { DrawingBase, DrawingToolBase, RectangleAxisPaneRenderer, type Point, type ViewPoint } from './drawing-base.ts';
import { MathHelper, type BezierCurvesPointsInfo } from './math-helper.ts';
import { CollisionHelper } from './collision-helper.ts';
import { calculateDrawingPoint, convertViewPointToPoint2D, convertViewPointToVector2D } from './conversion-helper.ts';


export function fillBezierPath(renderingScope: BitmapCoordinatesRenderingScope, bezierCurveInfo: BezierCurvesPointsInfo, fillColor: string, lineColor: string) {
	const ctx = renderingScope.context;

	const bezierSplines: Point2D[] = Array<Point2D>(bezierCurveInfo.endPoints.length + bezierCurveInfo.controlPoints1.length + bezierCurveInfo.controlPoints2.length);
	/// ------------------------------------------------------------------
	/// bezierSplines array structure: 
	/// 
	/// [point_0, control_point_0_0, control_point_1_0, point_1, 
	/// 		  control_point_0_1, control_point_1_1, point_2,
	/// 		  ....
	/// 		  control_point_0_i, control_point_1_i, point_i, 
	/// 		  ....
	/// 		  control_point_0_n, control_point_1_n, point_n] 
	/// ------------------------------------------------------------------

	let i = 0;
	bezierCurveInfo.endPoints.forEach((point) => {
		bezierSplines[i] = point;
		i += 3;
	});

	i = 1;
	for (let j = 0; j < bezierCurveInfo.controlPoints1.length; ++j) {
		bezierSplines[i] = bezierCurveInfo.controlPoints1[j];
		bezierSplines[i + 1] = bezierCurveInfo.controlPoints2[j];
		i += 3;
	}
	ctx.beginPath();
	ctx.fillStyle = fillColor;

	ctx.moveTo(bezierSplines[0].x, bezierSplines[0].y);
	for (let i = 0; i + 3 < bezierSplines.length; i += 3) {
		ctx.bezierCurveTo(bezierSplines[i + 1].x, bezierSplines[i + 1].y,
			bezierSplines[i + 2].x, bezierSplines[i + 2].y,
			bezierSplines[i + 3].x, bezierSplines[i + 3].y);
	}
	ctx.closePath();
	ctx.fill();

	ctx.strokeStyle = lineColor;
	ctx.lineWidth = 4;
	ctx.stroke();
}

class CurvePaneRenderer implements IPrimitivePaneRenderer {
	_points: ViewPoint[];
	_options: CurveOptions;

	constructor(points: ViewPoint[], options: CurveOptions) {
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

      const drawingPoints: Point2D[] = [];
      this._points.forEach((it) => {
        drawingPoints.push(convertViewPointToPoint2D(it));
      });

			if (this._points.length < 3) {
				ctx.beginPath();
				ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
				ctx.lineTo(drawingPoints[1].x, drawingPoints[1].y);
				ctx.strokeStyle = this._options.lineColor;
				ctx.lineWidth = scope.verticalPixelRatio;
				ctx.stroke();
			}
			else {
				const bezierCurveInfo = MathHelper.GetCubicBezierCurveDrawingPoints(
					convertViewPointToPoint2D(this._points[0]),
					convertViewPointToPoint2D(this._points[2]),
					convertViewPointToPoint2D(this._points[1]),
				);
				fillBezierPath(scope, bezierCurveInfo, this._options.fillColor, this._options.lineColor);
			}
		});
	}

	hitTest(x: number, y: number): PrimitiveHoveredItem | null {
		if (this._points.length < 3) {
			return null;
		}

		const vertex1: Vector2D = convertViewPointToVector2D(this._points[0]);
		const vertex2: Vector2D = convertViewPointToVector2D(this._points[1]);
		const coVertex: Vector2D = convertViewPointToVector2D(this._points[2]);

		const dir: Vector2D = vertex1.subtract(vertex2);
		const controlPoint1: Vector2D = coVertex.add(dir.scale(0.25, 0.25));
		const controlPoint2: Vector2D = coVertex.subtract(dir.scale(0.25, 0.25));

		const epsilon: number = 3e-0;

		const currPoint = new Point2D(x, y);
		const hitFirstHalf = CollisionHelper.HitTestQuadraticBezierCurve(new Point2D(vertex1.x, vertex1.y), new Point2D(coVertex.x, coVertex.y), new Point2D(controlPoint1.x, controlPoint1.y), currPoint, epsilon);
		const hitSecondHalf = CollisionHelper.HitTestQuadraticBezierCurve(new Point2D(coVertex.x, coVertex.y), new Point2D(vertex2.x, vertex2.y), new Point2D(controlPoint2.x, controlPoint2.y), currPoint, epsilon);

		if (!hitFirstHalf && !hitSecondHalf) {
			return null;
		}

		return {
			cursorStyle: "grab",
			externalId: 'curve-drawing',
			zOrder: 'top',
		};
	}
}

class CurvePaneView implements IPrimitivePaneView {
	_source: Curve;
	_points: Point[];
	_drawingPoints: ViewPoint[];

	constructor(source: Curve) {
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
		return new CurvePaneRenderer(
			this._drawingPoints,
			this._source._options,
		);
	}
}

abstract class CurveAxisPaneView implements IPrimitivePaneView {
	_source: Curve;
	_minPoint: number | null = null;
	_maxPoint: number | null = null;
	_vertical: boolean = false;

	constructor(source: Curve, vertical: boolean) {
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

class CurvePriceAxisPaneView extends CurveAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const series = this._source.series;
		const y1 = series.priceToCoordinate(this._source._bounds._minPrice ?? 0);
		const y2 = series.priceToCoordinate(this._source._bounds._maxPrice ?? 0);
		return [y1, y2];
	}
}

class CurveTimeAxisPaneView extends CurveAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const timeScale = this._source.chart.timeScale();
		const x1 = timeScale.timeToCoordinate(this._source._bounds._minTime as Time);
		const x2 = timeScale.timeToCoordinate(this._source._bounds._maxTime as Time);
		return [x1, x2];
	}
}

abstract class CurveAxisView implements ISeriesPrimitiveAxisView {
	_source: Curve;
	_p: Point;
	_pos: Coordinate | null = null;
	constructor(source: Curve, p: Point) {
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

class CurveTimeAxisView extends CurveAxisView {
	update() {
		const timeScale = this._source.chart.timeScale();
		this._pos = timeScale.timeToCoordinate(this._p.time);
	}
	text() {
		return this._source._options.timeLabelFormatter(this._p.time);
	}
}

class CurvePriceAxisView extends CurveAxisView {
	update() {
		const series = this._source.series;
		this._pos = series.priceToCoordinate(this._p.price);
	}
	text() {
		return this._source._options.priceLabelFormatter(this._p.price);
	}
}

export interface CurveOptions {
	lineColor: string;
	fillColor: string;
	previewFillColor: string;
	labelColor: string;
	labelTextColor: string;
	showLabels: boolean;
	priceLabelFormatter: (price: number) => string;
	timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: CurveOptions = {
	lineColor: 'rgba(234, 19, 19, 0.59)',
	fillColor: 'rgba(19, 148, 234, 0.59)',
	previewFillColor: 'rgba(19, 148, 234, 0.36)',
	labelColor: 'rgba(19, 148, 234, 0.59)',
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

class Curve extends DrawingBase<CurveOptions> {
	_paneViews: CurvePaneView[];
	_timeAxisViews: CurveTimeAxisView[] = [];
	_priceAxisViews: CurvePriceAxisView[] = [];
	_priceAxisPaneViews: CurvePriceAxisPaneView[];
	_timeAxisPaneViews: CurveTimeAxisPaneView[];

	constructor(
		points: Point[],
		options: Partial<CurveOptions> = {}
	) {
		super(points, defaultOptions, options);

		this._paneViews = [new CurvePaneView(this)];
		points.forEach(point => {
			this._timeAxisViews.push(new CurveTimeAxisView(this, point));
			this._priceAxisViews.push(new CurvePriceAxisView(this, point));
		});
		this._priceAxisPaneViews = [new CurvePriceAxisPaneView(this, true)];
		this._timeAxisPaneViews = [new CurveTimeAxisPaneView(this, false)];
	}

	public override addPoint(p: Point) {
		this._updateDrawingBounds(p);
		this._points.push(p);
		this._timeAxisViews.push(new CurveTimeAxisView(this, p));
		this._priceAxisViews.push(new CurvePriceAxisView(this, p));
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

	applyOptions(options: Partial<CurveOptions>) {
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

class PreviewCurve extends Curve {
	constructor(
		points: Point[],
		options: Partial<CurveOptions> = {}
	) {
		super(points, options);
		this._options.fillColor = this._options.previewFillColor;
	}
}

export class CurveDrawingTool extends DrawingToolBase<
	DrawingBase<CurveOptions>,
	DrawingBase<CurveOptions>,
	CurveOptions> {
	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		options: Partial<CurveOptions>
	) {
		super(Curve, PreviewCurve, chart, series, defaultOptions, options);
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
