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
import { ensureDefined } from '../../helpers/assertions.ts';
import { PluginBase } from '../plugin-base.ts';
import { positionsBox } from '../../helpers/dimensions/positions.ts';
import { Point as Point2D } from '@flatten-js/core';
import { Vector as Vector2D } from '@flatten-js/core';
import { Segment } from '@flatten-js/core';
import { DrawingBase, DrawingToolBase, type Point, type ViewPoint } from './drawing-base.ts';
import { MathHelper, type BezierCurvesPointsInfo } from './math-helper.ts';
import { CollisionHelper } from './collision-helper.ts';


export function fillBezierPath(renderingScope: BitmapCoordinatesRenderingScope, bezierCurveInfo: BezierCurvesPointsInfo, fillColor: string) {
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

	for (let i = 0; i + 3 < bezierSplines.length; i += 3) {
		ctx.moveTo(bezierSplines[i].x, bezierSplines[i].y);
		ctx.bezierCurveTo(bezierSplines[i + 1].x, bezierSplines[i + 1].y,
			bezierSplines[i + 2].x, bezierSplines[i + 2].y,
			bezierSplines[i + 3].x, bezierSplines[i + 3].y);
	}
	ctx.lineTo(bezierSplines[0].x, bezierSplines[0].y);
	ctx.closePath();
	ctx.fill();
}

class CurvePaneRenderer implements IPrimitivePaneRenderer {
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
			const calculateDrawingPoint = (point: ViewPoint): ViewPoint => {
				return {
					x: Math.round(point.x * scope.horizontalPixelRatio),
					y: Math.round(point.y * scope.verticalPixelRatio)
				};
			};

			for (let i = 0; i < this._points.length; i++) {
				this._points[i] = calculateDrawingPoint(this._points[i]);
			}

			if (this._points.length < 3) {
				ctx.beginPath();
				ctx.moveTo(this._points[0].x, this._points[0].y);
				ctx.lineTo(this._points[1].x, this._points[1].y);
				ctx.strokeStyle = this._fillColor;
				ctx.lineWidth = scope.verticalPixelRatio;
				ctx.stroke();
			}
			else {
				const bezierCurveInfo = MathHelper.GetCubicBezierCurveDrawingPoints(
					new Point2D(this._points[0].x, this._points[0].y),
					new Point2D(this._points[2].x, this._points[2].y),
					new Point2D(this._points[1].x, this._points[1].y),
				);
				fillBezierPath(scope, bezierCurveInfo, this._fillColor);
			}
		});
	}

	hitTest(x: number, y: number): PrimitiveHoveredItem | null {
		if (this._points.length < 3) {
			return;
		}
		const vertex1: Vector2D = new Vector2D(this._points[0].x, this._points[0].y);
		const vertex2: Vector2D = new Vector2D(this._points[1].x, this._points[1].y);
		const coVertex: Vector2D = new Vector2D(this._points[2].x, this._points[2].y);

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
			this._source._options.fillColor
		);
	}
}

class CurveAxisPaneRenderer implements IPrimitivePaneRenderer {
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

abstract class CurveAxisPaneView implements IPrimitivePaneView {
	_source: Curve;
	_p1: number | null = null;
	_p2: number | null = null;
	_p3: number | null = null;
	_vertical: boolean = false;

	constructor(source: Curve, vertical: boolean) {
		this._source = source;
		this._vertical = vertical;
	}

	abstract getPoints(): [Coordinate | null, Coordinate | null, Coordinate | null];

	update() {
		[this._p1, this._p2, this._p3] = this.getPoints();
	}

	renderer() {
		return new CurveAxisPaneRenderer(
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

class CurvePriceAxisPaneView extends CurveAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null, Coordinate | null] {
		const series = this._source.series;
		const y1 = series.priceToCoordinate(this._source._p1.price);
		const y2 = series.priceToCoordinate(this._source._p2.price);
		const y3 = series.priceToCoordinate(this._source._p3.price);
		return [y1, y2, y3];
	}
}

class CurveTimeAxisPaneView extends CurveAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null, Coordinate | null] {
		const timeScale = this._source.chart.timeScale();
		const x1 = timeScale.timeToCoordinate(this._source._p1.time);
		const x2 = timeScale.timeToCoordinate(this._source._p2.time);
		const x3 = timeScale.timeToCoordinate(this._source._p3.time);
		return [x1, x2, x3];
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

export interface CurveDrawingToolOptions {
	fillColor: string;
	previewFillColor: string;
	labelColor: string;
	labelTextColor: string;
	showLabels: boolean;
	priceLabelFormatter: (price: number) => string;
	timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: CurveDrawingToolOptions = {
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

class Curve extends DrawingBase<CurveDrawingToolOptions> {
	_paneViews: CurvePaneView[];
	// TODO: rewrite commented classes 
	// _timeAxisViews: CurveTimeAxisView[];
	// _priceAxisViews: CurvePriceAxisView[];
	// _priceAxisPaneViews: CurvePriceAxisPaneView[];
	// _timeAxisPaneViews: CurveTimeAxisPaneView[];

	constructor(
		points: Point[],
		options: Partial<CurveDrawingToolOptions> = {}
	) {
		super(points, defaultOptions, options);

		this._paneViews = [new CurvePaneView(this)];
		// this._timeAxisViews = [
		// 	new CurveTimeAxisView(this, this._p1),
		// 	new CurveTimeAxisView(this, this._p2),
		// 	new CurveTimeAxisView(this, this._p3),
		// ];
		// this._priceAxisViews = [
		// 	new CurvePriceAxisView(this, this._p1),
		// 	new CurvePriceAxisView(this, this._p2),
		// 	new CurvePriceAxisView(this, this._p3),
		// ];
		// this._priceAxisPaneViews = [new CurvePriceAxisPaneView(this, true)];
		// this._timeAxisPaneViews = [new CurveTimeAxisPaneView(this, false)];
	}

	public override addPoint(p: Point) {
		this._points.push(p);
		this.requestUpdate();
	}

	public override updatePoint(p: Point, index: number) {
		if (index >= this._points.length || index < 0)
			return;

		this._points[index] = p;
		this._paneViews[0].update();
		// this._timeAxisViews[0].movePoint(p);
		// this._priceAxisViews[0].movePoint(p);

		this.requestUpdate();
	}

	updateAllViews() {
		this._paneViews.forEach(pw => pw.update());
		// this._timeAxisViews.forEach(pw => pw.update());
		// this._priceAxisViews.forEach(pw => pw.update());
		// this._priceAxisPaneViews.forEach(pw => pw.update());
		// this._timeAxisPaneViews.forEach(pw => pw.update());
	}

	// priceAxisViews() {
	//   return this._priceAxisViews;
	// }

	// timeAxisViews() {
	//   return this._timeAxisViews;
	// }

	paneViews() {
		return this._paneViews;
	}

	// priceAxisPaneViews() {
	// 	return this._priceAxisPaneViews;
	// }

	// timeAxisPaneViews() {
	// 	return this._timeAxisPaneViews;
	// }

	applyOptions(options: Partial<CurveDrawingToolOptions>) {
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
		options: Partial<CurveDrawingToolOptions> = {}
	) {
		super(points, options);
		this._options.fillColor = this._options.previewFillColor;
	}
}

export class CurveDrawingTool extends DrawingToolBase<
	DrawingBase<CurveDrawingToolOptions>,
	DrawingBase<CurveDrawingToolOptions>,
	CurveDrawingToolOptions> {
	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		options: Partial<CurveDrawingToolOptions>
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
		if (this._points.length == 3) {
			this._removePreviewDrawing();
			this._addNewDrawing(this._points);
			this.stopDrawing();
		} else {
			this._addPoint(newPoint);
			if (this._previewDrawing == null) {
				this._addPoint(newPoint);
				this._addPreviewDrawing(this._points);
			}
		}
	}
}
