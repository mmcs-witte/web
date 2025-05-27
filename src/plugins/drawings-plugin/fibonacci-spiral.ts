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

import { Point as Point2D, Segment, Vector as Vector2D } from '@flatten-js/core';
import { DrawingBase, DrawingToolBase, RectangleAxisPaneRenderer, type Point, type ViewPoint } from './drawing-base.ts';
import { MathHelper } from './math-helper.ts';
import { CollisionHelper } from './collision-helper.ts';
import { calculateDrawingPoint, convertViewPointToPoint2D } from './conversion-helper.ts';

export interface FibSpiralRenderInfo {
	rotationCenter: ViewPoint;
	rayStart: ViewPoint;
	rayEnd: ViewPoint;
	spiralRotationAngle: number;
	numArcs: number;
	arcCenters: ViewPoint[];
	arcRadiuses: number[];
	arcAngles: number[][];
}


class FibSpiralPaneRenderer implements IPrimitivePaneRenderer {
	_fibSpiralRendeInfo: FibSpiralRenderInfo;
	_options: FibSpiralOptions;

	constructor(renderInfo: FibSpiralRenderInfo, options: FibSpiralOptions) {
		this._fibSpiralRendeInfo = renderInfo;
		this._options = options;
	}

	draw(target: CanvasRenderingTarget2D) {
		target.useBitmapCoordinateSpace(scope => {
			if (this._fibSpiralRendeInfo.numArcs == 0)
				return;

			const degreesToRadian = (degrees: number): number => {
				return degrees / 180.0 * Math.PI;
			}

			const rotationCenter = convertViewPointToPoint2D(calculateDrawingPoint(this._fibSpiralRendeInfo.rotationCenter, scope));
			const spiralRotationAngle = this._fibSpiralRendeInfo.spiralRotationAngle;
			const numArcs = this._fibSpiralRendeInfo.numArcs;
			const arcCenters = this._fibSpiralRendeInfo.arcCenters;
			const arcRadiuses = this._fibSpiralRendeInfo.arcRadiuses;
			const arcAngles = this._fibSpiralRendeInfo.arcAngles;
			const rayStart = convertViewPointToPoint2D(calculateDrawingPoint(this._fibSpiralRendeInfo.rayStart, scope));
			const rayEnd = convertViewPointToPoint2D(calculateDrawingPoint(this._fibSpiralRendeInfo.rayEnd, scope));

			const ctx = scope.context;
			ctx.save();
			ctx.translate(rotationCenter.x as number, rotationCenter.y as number);
			ctx.rotate(spiralRotationAngle);

			ctx.beginPath();

			ctx.moveTo(rayEnd.x - rotationCenter.x, rayEnd.y - rotationCenter.y);
			ctx.lineTo(rayStart.x - rotationCenter.x, rayStart.y - rotationCenter.y);

			// Draw arcs
			for (let i = 0; i < numArcs; ++i) {
				const center: Point2D = convertViewPointToPoint2D(calculateDrawingPoint(arcCenters[i], scope));
				const centerX = center.x;
				const centerY = center.y;
				const radius = arcRadiuses[i];
				const startAngle = degreesToRadian(arcAngles[i][0]);
				const sweepAngle = degreesToRadian(arcAngles[i][1]);

				ctx.arc(centerX, centerY, 2 * radius, startAngle, startAngle + sweepAngle);
			}

			ctx.lineWidth = 5;
			ctx.strokeStyle = this._options.lineColor;
			ctx.lineJoin = 'bevel';
			ctx.stroke();

			ctx.restore(); // Restore transformation
		});
	}

	// TODO: fix this. It doesn't hit test arcs correctly
	hitTest(x: number, y: number): PrimitiveHoveredItem | null {
		if (this._fibSpiralRendeInfo.numArcs == 0) {
			return null;
		}

		const tolerance: number = 3e-0;
		const hitTestPoint: Point2D = new Point2D(x, y);

		const rotationCenter: Vector2D = new Vector2D(this._fibSpiralRendeInfo.rotationCenter.x as number, this._fibSpiralRendeInfo.rotationCenter.y as number);

		// Rotate current point around fibSpiralDrawInfo.rotationCenter to -rotationAngle
		let  hitTestPointLocal: Vector2D = new Vector2D(hitTestPoint.x, hitTestPoint.y).subtract(rotationCenter);
		hitTestPointLocal = MathHelper.RotateVector(hitTestPointLocal, -this._fibSpiralRendeInfo.spiralRotationAngle);
		const hitTestPointRotated: Vector2D = rotationCenter.add(hitTestPointLocal);

		const ray: Segment = new Segment(new Point2D(this._fibSpiralRendeInfo.rayStart.x as number, this._fibSpiralRendeInfo.rayStart.y as number), new Point2D(this._fibSpiralRendeInfo.rayEnd.x as number, this._fibSpiralRendeInfo.rayEnd.y as number));

		let hit: boolean = false;
		const distToRay: number = ray.distanceTo(new Point2D(hitTestPointRotated.x, hitTestPointRotated.y))[0];
		if (distToRay < tolerance) {
			hit = true;
		}

		// Get distances to all the arcs
		for (let i = 0; i < this._fibSpiralRendeInfo.numArcs && !hit; i++) {
			const startAngle: number = this._fibSpiralRendeInfo.arcAngles[i][0];
			const sweepAngle: number = this._fibSpiralRendeInfo.arcAngles[i][1];

			const arcCenterLocal: Vector2D = new Vector2D(this._fibSpiralRendeInfo.arcCenters[i].x as number, this._fibSpiralRendeInfo.arcCenters[i].y as number);
			const arcCenterVec = rotationCenter.add(arcCenterLocal)
			const arcCenter = new Point2D(arcCenterVec.x, arcCenterVec.y);

			hit = CollisionHelper.HitTestArc(
				new Point2D(hitTestPointRotated.x, hitTestPointRotated.y),
				arcCenter,
				this._fibSpiralRendeInfo.arcRadiuses[i],
				startAngle,
				sweepAngle,
				tolerance);
		}

		if (hit) {
			return {
				cursorStyle: "grab",
				externalId: 'fib-spiral-drawing',
				zOrder: 'top',
			};
		} else {
			return null;
		}
	}
}

class FibSpiralPaneView implements IPrimitivePaneView {
	_source: FibSpiral;
	_points: Point[];
	_drawingPoints: ViewPoint[];

	constructor(source: FibSpiral) {
		this._source = source;
		this._points = source._points;
		this._drawingPoints = new Array<ViewPoint>(source._points.length);
	}

	updateRenderInfo(drawingPoints: ViewPoint[]): FibSpiralRenderInfo {
		let spiralRotationCenter: ViewPoint = { x: 0 as Coordinate, y: 0 as Coordinate };
		let spiralRotationAngle: number = 0;
		let numArcs: number = 0;
		let arcCenters: ViewPoint[] = [];
		let arcRadiuses: number[] = [];
		let arcAngles: number[][] = [];
		let rayStart : ViewPoint= { x: 0 as Coordinate, y: 0 as Coordinate};
		let rayEnd : ViewPoint = { x: 0 as Coordinate, y: 0 as Coordinate };

		const pointsAreValid = drawingPoints.length == 2 && drawingPoints[0].x != null && drawingPoints[1].x != null && drawingPoints[0].y != null && drawingPoints[1].y != null;
		const pointAreEqual = pointsAreValid && drawingPoints[0].x == drawingPoints[1].x && drawingPoints[0].y == drawingPoints[1].y;

		if (pointsAreValid && !pointAreEqual) {
			const p1: Vector2D = new Vector2D(drawingPoints[0].x as number, drawingPoints[0].y as number);
			const p2: Vector2D = new Vector2D(drawingPoints[1].x as number, drawingPoints[1].y as number);

			let initDir = p2.subtract(p1);

			spiralRotationAngle = -1 * MathHelper.AngleBetweenVectors(initDir, new Vector2D(1, 0));
			initDir = MathHelper.RotateVector(initDir, -spiralRotationAngle);

			const rotationCenter: Vector2D = p1;
			const directionPoint: Vector2D = p1.add(initDir);

			let a: number;
			{
				const p1 = new Point2D(rotationCenter.x, rotationCenter.y);
				const p2 = new Point2D(directionPoint.x, directionPoint.y);
				a = p1.distanceTo(p2)[0] / (Math.sqrt(55.0) + 1);
			}

			numArcs = 11;

			const bCounterClockwise: boolean = true;

			const clockwiseCoef: number = bCounterClockwise ? 1.0 : -1.0;
			arcCenters = new Array<ViewPoint>(numArcs);

			arcCenters[0] = { x: 0.0 as Coordinate, y: clockwiseCoef * a as Coordinate };
			arcCenters[1] = { x: -a as Coordinate, y: clockwiseCoef * a as Coordinate };
			arcCenters[2] = { x: -a as Coordinate, y: clockwiseCoef * 0.0 as Coordinate };
			arcCenters[3] = { x: a as Coordinate, y: clockwiseCoef * 0.0 as Coordinate };
			arcCenters[4] = { x: a as Coordinate, y: clockwiseCoef * 3.0 * a as Coordinate };
			arcCenters[5] = { x: -4.0 * a as Coordinate, y: clockwiseCoef * 3.0 * a as Coordinate };
			arcCenters[6] = { x: -4.0 * a as Coordinate, y: clockwiseCoef * -5.0 * a as Coordinate };
			arcCenters[7] = { x: 9.0 * a as Coordinate, y: clockwiseCoef * -5.0 * a as Coordinate };
			arcCenters[8] = { x: 9.0 * a as Coordinate, y: clockwiseCoef * 16.0 * a as Coordinate };
			arcCenters[9] = { x: -25.0 * a as Coordinate, y: clockwiseCoef * 16.0 * a as Coordinate };
			arcCenters[10] = { x: -25.0 * a as Coordinate, y: clockwiseCoef * -39.0 * a as Coordinate };

			arcRadiuses = new Array<number>(numArcs);
			arcRadiuses[0] = a;
			arcRadiuses[1] = 2.0 * a;
			for (let i = 2; i < 11; i++) {
				arcRadiuses[i] = arcRadiuses[i - 1] + arcRadiuses[i - 2];
			}

			arcAngles = new Array<number[]>(numArcs);
			if (bCounterClockwise) {
				arcAngles[0] = [270.0, 90.0];
				arcAngles[1] = [0.0, 90.0];
				arcAngles[2] = [90.0, 90.0];
				arcAngles[3] = [180.0, 90.0];
				arcAngles[4] = [270.0, 90.0];
				arcAngles[5] = [0.0, 90.0];
				arcAngles[6] = [90.0, 90.0];
				arcAngles[7] = [180.0, 90.0];
				arcAngles[8] = [270.0, 90.0];
				arcAngles[9] = [0.0, 90.0];
				arcAngles[10] = [90.0, 90.0];
			} else {
				arcAngles[0] = [90.0, -90.0];
				arcAngles[1] = [360.0, -90.0];
				arcAngles[2] = [270.0, -90.0];
				arcAngles[3] = [180.0, -90.0];
				arcAngles[4] = [90.0, -90.0];
				arcAngles[5] = [360.0, -90.0];
				arcAngles[6] = [270.0, -90.0];
				arcAngles[7] = [180.0, -90.0];
				arcAngles[8] = [90.0, -90.0];
				arcAngles[9] = [360.0, -90.0];
				arcAngles[10] = [270.0, -70.0];
			}

			spiralRotationCenter = { x: p1.x as Coordinate, y: p1.y  as Coordinate };

			rayStart = spiralRotationCenter;

			const bigNumber: number = 3000; // Hack: extending ray beyond the end of the screen
			rayEnd = { x: directionPoint.x + bigNumber as Coordinate, y: directionPoint.y as Coordinate};
		}

		return {
			rotationCenter: spiralRotationCenter,
			spiralRotationAngle: spiralRotationAngle,
			numArcs,
			arcCenters,
			arcRadiuses,
			arcAngles,
			rayStart,
			rayEnd,
		}
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
		return new FibSpiralPaneRenderer(
			this.updateRenderInfo(this._drawingPoints),
			this._source._options,
		);
	}
}

abstract class FibChannelAxisPaneView implements IPrimitivePaneView {
	_source: FibSpiral;
	_minPoint: number | null = null;
	_maxPoint: number | null = null;
	_vertical: boolean = false;

	constructor(source: FibSpiral, vertical: boolean) {
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
			this._source._options.lineColor,
			this._vertical
		);
	}
	zOrder(): PrimitivePaneViewZOrder {
		return 'bottom';
	}
}

class FibSpiralPriceAxisPaneView extends FibChannelAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const series = this._source.series;
		const y1 = series.priceToCoordinate(this._source._bounds._minPrice as Coordinate);
		const y2 = series.priceToCoordinate(this._source._bounds._maxPrice as Coordinate);
		return [y1, y2];
	}
}

class FibSpiralTimeAxisPaneView extends FibChannelAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const timeScale = this._source.chart.timeScale();
		const x1 = timeScale.timeToCoordinate(this._source._bounds._minTime as Time);
		const x2 = timeScale.timeToCoordinate(this._source._bounds._maxTime as Time);
		return [x1, x2];
	}
}

abstract class FibChannelAxisView implements ISeriesPrimitiveAxisView {
	_source: FibSpiral;
	_p: Point;
	_pos: Coordinate | null = null;
	constructor(source: FibSpiral, p: Point) {
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

class FibSpiralTimeAxisView extends FibChannelAxisView {
	update() {
		const timeScale = this._source.chart.timeScale();
		this._pos = timeScale.timeToCoordinate(this._p.time);
	}
	text() {
		return this._source._options.timeLabelFormatter(this._p.time);
	}
}

class FibSpiralPriceAxisView extends FibChannelAxisView {
	update() {
		const series = this._source.series;
		this._pos = series.priceToCoordinate(this._p.price);
	}
	text() {
		return this._source._options.priceLabelFormatter(this._p.price);
	}
}


export interface FibSpiralOptions {
	lineColor: string;
	previewLineColor: string;
	labelColor: string;
	labelTextColor: string;
	showLabels: boolean;
	priceLabelFormatter: (price: number) => string;
	timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: FibSpiralOptions = {
	lineColor: 'rgba(238, 20, 93, 0.75)',
	previewLineColor: 'rgba(250, 19, 96, 0.91)',
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

class FibSpiral extends DrawingBase<FibSpiralOptions> {
	_paneViews: FibSpiralPaneView[];
	_timeAxisViews: FibSpiralTimeAxisView[] = [];
	_priceAxisViews: FibSpiralPriceAxisView[] = [];
	_priceAxisPaneViews: FibSpiralPriceAxisPaneView[];
	_timeAxisPaneViews: FibSpiralTimeAxisPaneView[];

	constructor(points: Point[], options: Partial<FibSpiralOptions> = {}) {
		super(points, defaultOptions, options);

		this._paneViews = [new FibSpiralPaneView(this)];
		points.forEach((point) => {
			this._timeAxisViews.push(new FibSpiralTimeAxisView(this, point));
			this._priceAxisViews.push(new FibSpiralPriceAxisView(this, point));
		});
		this._priceAxisPaneViews = [new FibSpiralPriceAxisPaneView(this, true)];
		this._timeAxisPaneViews = [new FibSpiralTimeAxisPaneView(this, false)];
	}

	public override addPoint(p: Point) {
		this._updateDrawingBounds(p);
		this._points.push(p);
		this._timeAxisViews.push(new FibSpiralTimeAxisView(this, p));
		this._priceAxisViews.push(new FibSpiralPriceAxisView(this, p));
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

	applyOptions(options: Partial<FibSpiralOptions>) {
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

class FibSpiralPreview extends FibSpiral {
	constructor(points: Point[], options: Partial<FibSpiralOptions> = {}) {
		super(points, options);
		this._options.lineColor = this._options.previewLineColor;
	}
}

export class FibSpiralDrawingTool extends DrawingToolBase<
	DrawingBase<FibSpiralOptions>,
	DrawingBase<FibSpiralOptions>,
	FibSpiralOptions
> {
	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		options: Partial<FibSpiralOptions>
	) {
		super(FibSpiral, FibSpiralPreview, chart, series, defaultOptions, options);
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
