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

import { Point as Point2D, Vector as Vector2D } from '@flatten-js/core';

class FibSpiralPaneRenderer implements IPrimitivePaneRenderer {
  _fibSpiralRendeInfo: FibSpiralRenderInfo;
  _lineColor: string;

	constructor(renderInfo: FibSpiralRenderInfo, lineColor: string) {
		this._fibSpiralRendeInfo = renderInfo;
    this._lineColor = lineColor;
	}

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      if (this._fibSpiralRendeInfo.numArcs == 0)
        return;

      const calculateDrawingPoint = (point: ViewPoint): ViewPoint =>  {
        if (point.x == null || point.y == null) {
          return {x: 0, y: 0};
        }
        
        return { 
          x : Math.round(point.x * scope.horizontalPixelRatio),
          y : Math.round(point.y * scope.verticalPixelRatio)
        };
      };

      const degreesToRadian = (degrees: number) : number => {
        return degrees / 180.0 * Math.PI;
      }
      
      const rotationCenter = calculateDrawingPoint(this._fibSpiralRendeInfo.rotationCenter);
      const spiralRotationAngle = this._fibSpiralRendeInfo.spiralRotationAngle;
      const numArcs = this._fibSpiralRendeInfo.numArcs;
      const arcCenters = this._fibSpiralRendeInfo.arcCenters;
      const arcRadiuses = this._fibSpiralRendeInfo.arcRadiuses;
      const arcAngles = this._fibSpiralRendeInfo.arcAngles;
      const rayStart = calculateDrawingPoint(this._fibSpiralRendeInfo.rayStart);
      const rayEnd = calculateDrawingPoint(this._fibSpiralRendeInfo.rayEnd);

      const ctx = scope.context;
      ctx.save();
      ctx.translate(rotationCenter.x, rotationCenter.y);
      // TODO: make sure it is clockwise radian angle
      ctx.rotate(spiralRotationAngle);

      ctx.beginPath();

      ctx.moveTo(rayEnd.x - rotationCenter.x, rayEnd.y - rotationCenter.y);
      ctx.lineTo(rayStart.x - rotationCenter.x, rayStart.y - rotationCenter.y);

      // Draw arcs
      for (let i = 0; i < numArcs; ++i) {
          const center = calculateDrawingPoint(arcCenters[i]);
          const centerX = center.x;
          const centerY = center.y;
          const radius = arcRadiuses[i];
          const startAngle = degreesToRadian(arcAngles[i][0]);
          const sweepAngle = degreesToRadian(arcAngles[i][1]);
      
          ctx.arc(centerX, centerY, 2 * radius, startAngle, startAngle + sweepAngle);
      }

      ctx.lineWidth = 5;
      ctx.strokeStyle = this._lineColor;
      ctx.lineJoin = 'bevel';
      ctx.stroke();

      ctx.restore(); // Restore transformation
    });
  }
}

interface ViewPoint {
	x: Coordinate | null;
	y: Coordinate | null;
}

class FibSpiralPaneView implements IPrimitivePaneView {
	_source: FibSpiral;
	_p1: ViewPoint = { x: null, y: null };
	_p2: ViewPoint = { x: null, y: null };

	constructor(source: FibSpiral) {
		this._source = source;
	}

  updateRenderInfo(p1: ViewPoint, p2: ViewPoint): FibSpiralRenderInfo {
    let spiralRotationCenter = {x: 0, y: 0};
    let spiralRotationAngle: number = 0;
    let numArcs: number = 0;
    let arcCenters: ViewPoint[] = [];
    let arcRadiuses: number[] = [];
    let arcAngles: number[][] = [];
    let rayStart = {x: 0, y: 0};
    let rayEnd = {x: 0, y: 0};;
    
    const pointsAreValid = p1.x != null && p1.y != null && p2.x != null && p2.y != null;
    const pointAreEqual = pointsAreValid && p1.x == p2.x && p1.y == p2.y;
    
    if (pointsAreValid && !pointAreEqual) {
      const p1: Vector2D = new Vector2D(this._p1.x, this._p1.y);
      const p2: Vector2D = new Vector2D(this._p2.x, this._p2.y);

      let initDir = p2.subtract(p1);

      spiralRotationAngle = initDir.angleTo(new Vector2D(1, 0));
      initDir = initDir.rotate(-spiralRotationAngle);

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

      // TODO: make sure this cast works
      arcCenters[0] = {x: 0.0, y: clockwiseCoef * a};
      arcCenters[1] = {x: -a, y: clockwiseCoef * a};
      arcCenters[2] = {x: -a, y: clockwiseCoef * 0.0};
      arcCenters[3] = {x: a, y: clockwiseCoef * 0.0};
      arcCenters[4] = {x: a, y: clockwiseCoef * 3.0 * a};
      arcCenters[5] = {x: -4.0 * a, y: clockwiseCoef * 3.0 * a};
      arcCenters[6] = {x: -4.0 * a, y: clockwiseCoef * -5.0 * a};
      arcCenters[7] = {x: 9.0 * a, y: clockwiseCoef * -5.0 * a};
      arcCenters[8] = {x: 9.0 * a, y: clockwiseCoef * 16.0 * a};
      arcCenters[9] = {x: -25.0 * a, y: clockwiseCoef * 16.0 * a};
      arcCenters[10] = {x: -25.0 * a, y: clockwiseCoef * -39.0 * a};

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

      spiralRotationCenter = {x: p1.x, y: p1.y };

      // TODO: learn how to Extend line a bit later
      // CFPoint points[2] = { p0, p1 };
      // ExtendLineToSecondPoint(points);
      // auto rayLength = MathHelper::GetDistanceBetweenPoints(points[0], points[1]);
  
      const rayEnd_ = rotationCenter.add(initDir);

      rayStart = {x: p1.x, y: p1.y};
      rayEnd = {x: rayEnd_.x, y: rayEnd_.y};
      //rayEnd = rotationCenter.add(new Vector2D(rayLength, 0.0));
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
		return new FibSpiralPaneRenderer(
			this.updateRenderInfo(this._p1, this._p2),
			this._source._options.lineColor
		);
	}
}

class RectangleAxisPaneRenderer implements IPrimitivePaneRenderer {
	_p1: number | null;
	_p2: number | null;
	_fillColor: string;
	_vertical: boolean = false;

	constructor(
		p1: number | null,
		p2: number | null,
		fillColor: string,
		vertical: boolean
	) {
		this._p1 = p1;
		this._p2 = p2;
		this._fillColor = fillColor;
		this._vertical = vertical;
	}

	draw(target: CanvasRenderingTarget2D) {
		target.useBitmapCoordinateSpace(scope => {
			if (this._p1 === null || this._p2 === null) return;
			const ctx = scope.context;
			ctx.globalAlpha = 0.5;
			const positions = positionsBox(
				this._p1,
				this._p2,
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

abstract class RectangleAxisPaneView implements IPrimitivePaneView {
	_source: FibSpiral;
	_p1: number | null = null;
	_p2: number | null = null;
	_vertical: boolean = false;

	constructor(source: FibSpiral, vertical: boolean) {
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
			this._source._options.lineColor,
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

interface Point {
	time: Time;
	price: number;
}

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

export interface FibSpiralDrawingToolOptions {
	lineColor: string;
	previewLineColor: string;
	labelColor: string;
	labelTextColor: string;
	showLabels: boolean;
	priceLabelFormatter: (price: number) => string;
	timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: FibSpiralDrawingToolOptions = {
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

class FibSpiral extends PluginBase {
	_options: FibSpiralDrawingToolOptions;
	_p1: Point;
	_p2: Point;
	_paneViews: FibSpiralPaneView[];
	_timeAxisViews: RectangleTimeAxisView[];
	_priceAxisViews: RectanglePriceAxisView[];
	_priceAxisPaneViews: RectanglePriceAxisPaneView[];
	_timeAxisPaneViews: RectangleTimeAxisPaneView[];

	constructor(
		p1: Point,
		p2: Point,
		options: Partial<FibSpiralDrawingToolOptions> = {}
	) {
		super();
		this._p1 = p1;
		this._p2 = p2;
		this._options = {
			...defaultOptions,
			...options,
		};
		this._paneViews = [new FibSpiralPaneView(this)];
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

	applyOptions(options: Partial<FibSpiralDrawingToolOptions>) {
		this._options = { ...this._options, ...options };
		this.requestUpdate();
	}
}

class PreviewFibSpiral extends FibSpiral {
	constructor(
		p1: Point,
		p2: Point,
		options: Partial<FibSpiralDrawingToolOptions> = {}
	) {
		super(p1, p2, options);
		this._options.lineColor = this._options.previewLineColor;
	}

	public updateEndPoint(p: Point) {
		this._p2 = p;
		this._paneViews[0].update();
		this._timeAxisViews[1].movePoint(p);
		this._priceAxisViews[1].movePoint(p);
		this.requestUpdate();
	}
}

export class FibSpiralDrawingTool {
	private _chart: IChartApi | undefined;
	private _series: ISeriesApi<SeriesType> | undefined;
	private _defaultOptions: Partial<FibSpiralDrawingToolOptions>;
	private _drawings: FibSpiral[];
	private _previewDrawing: PreviewFibSpiral | undefined = undefined;
	private _points: Point[] = [];
	private _drawing: boolean = false;

	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		options: Partial<FibSpiralDrawingToolOptions>
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
		const rectangle = new FibSpiral(p1, p2, { ...this._defaultOptions });
		this._drawings.push(rectangle);
		ensureDefined(this._series).attachPrimitive(rectangle);
	}

	private _removeRectangle(rectangle: FibSpiral) {
		ensureDefined(this._series).detachPrimitive(rectangle);
	}

	private _addPreviewRectangle(p: Point) {
		this._previewDrawing = new PreviewFibSpiral(p, p, {
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
