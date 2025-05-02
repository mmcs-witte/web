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
import { PluginBase } from '../plugin-base.ts';
import { positionsBox } from '../../helpers/dimensions/positions.ts';
import { Point as Point2D } from '@flatten-js/core';
import { Vector as Vector2D } from '@flatten-js/core';

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
		this._points = points;
		this._fillColor = fillColor;
	}

	draw(target: CanvasRenderingTarget2D) {
		target.useBitmapCoordinateSpace(scope => {
			if (this._points.length < 2) {
				return;
			}
			
      const ctx = scope.context;

      const calculateDrawingPoint = (point: ViewPoint): ViewPoint =>  {
        return { 
          x : Math.round(point.x * scope.horizontalPixelRatio),
          y : Math.round(point.y * scope.verticalPixelRatio)
        };
      };

      for (let i = 0; i < this._points.length; i++) {
        this._points[i] = calculateDrawingPoint(this._points[i]);
      }

      ctx.beginPath();
      ctx.lineWidth = 5;
      ctx.strokeStyle = this._fillColor;
      ctx.moveTo(this._points[0].x, this._points[0].y);
      for (let i = 1; i < this._points.length; i++) {
        ctx.lineTo(this._points[i].x, this._points[i].y);
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
}

interface ViewPoint {
	x: Coordinate | null;
	y: Coordinate | null;
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
      this._drawingPoints[i] = {x: x, y: y};
    }
	}

	renderer() {
    return new PolylinePaneRenderer(
			this._drawingPoints,
			this._source._options.fillColor
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
		const y1 = series.priceToCoordinate(this._source._bounds._minPrice);
		const y2 = series.priceToCoordinate(this._source._bounds._maxPrice);
		return [y1, y2];
	}
}

class PolylineTimeAxisPaneView extends PolylineAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const timeScale = this._source.chart.timeScale();
		const x1 = timeScale.timeToCoordinate(this._source._bounds._minTime);
		const x2 = timeScale.timeToCoordinate(this._source._bounds._maxTime);
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
    : {time: 0, price: 0};
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

interface Point {
	time: Time;
	price: number;
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

interface DrawingBounds {
  _minTime: number;
  _maxTime: number;
  _minPrice: number;
  _maxPrice: number;
}
class Polyline extends PluginBase {
	_options: PolylineDrawingToolOptions;
	_points: Point[];
  _bounds: DrawingBounds;
	_paneViews: PolylinePaneView[];
	 _timeAxisViews: PolylineTimeAxisView[];
	_priceAxisViews: PolylinePriceAxisView[];
	// _priceAxisPaneViews: PolylinePriceAxisPaneView[];
	// _timeAxisPaneViews: PolylineTimeAxisPaneView[];

	constructor(
		points: Point[],
		options: Partial<PolylineDrawingToolOptions> = {}
	) {
		super();
    
    this._bounds =  {_minTime: 0, _maxTime: 0, _minPrice: 0, _maxPrice: 0};
    this._points = points;
    this._points.forEach((point) => {
      this._updateDrawingBounds(point);
    })
		this._options = {
			...defaultOptions,
			...options,
		};
		this._paneViews = [new PolylinePaneView(this)];
		this._timeAxisViews = [new PolylineTimeAxisView(this)];
		this._priceAxisViews = [new PolylinePriceAxisView(this)];

		// this._priceAxisPaneViews = [new PolylinePriceAxisPaneView(this, true)];
		// this._timeAxisPaneViews = [new PolylineTimeAxisPaneView(this, false)];
	}

  public addPoint(p: Point) {
    this._updateDrawingBounds(p);
    this._points.push(p);
    this.requestUpdate();
  }

	public updatePoint(p: Point, index : number) {
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
		// this._priceAxisPaneViews.forEach(pw => pw.update());
		// this._timeAxisPaneViews.forEach(pw => pw.update());
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

	// priceAxisPaneViews() {
	// 	return this._priceAxisPaneViews;
	// }

	// timeAxisPaneViews() {
	// 	return this._timeAxisPaneViews;
	// }

	applyOptions(options: Partial<PolylineDrawingToolOptions>) {
		this._options = { ...this._options, ...options };
		this.requestUpdate();
	}

  private _updateDrawingBounds(point: Point) {
    this._bounds._minPrice = Math.min(this._bounds._minPrice, point.price);
    this._bounds._maxPrice = Math.max(this._bounds._maxPrice, point.price);

    this._bounds._minTime = Math.min(this._bounds._minTime, point.time);
    this._bounds._maxTime = Math.max(this._bounds._maxTime, point.time);
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

export class PolylineDrawingTool {
	private _chart: IChartApi | undefined;
	private _series: ISeriesApi<SeriesType> | undefined;
	private _defaultOptions: Partial<PolylineDrawingToolOptions>;
	private _drawings: Polyline[];
	private _previewDrawing: PreviewPolyline | undefined = undefined;
	private _points: Point[] = [];
	private _drawing: boolean = false;

	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		options: Partial<PolylineDrawingToolOptions>
	) {
		this._chart = chart;
		this._series = series;
		this._defaultOptions = options;
		this._drawings = [];
		this._chart.subscribeClick(this._clickHandler);
		this._chart.subscribeDblClick(this._dblClickHandler);
		this._chart.subscribeCrosshairMove(this._moveHandler);
	}

	private _clickHandler = (param: MouseEventParams) => this._onClick(param);
	private _dblClickHandler = (param: MouseEventParams) => this._onDblClick(param);
	private _moveHandler = (param: MouseEventParams) => this._onMouseMove(param);

	remove() {
		this.stopDrawing();
		if (this._chart) {
			this._chart.unsubscribeClick(this._clickHandler);
			this._chart.unsubscribeDblClick(this._dblClickHandler);
			this._chart.unsubscribeCrosshairMove(this._moveHandler);
		}
		this._drawings.forEach(Polyline => {
			this._removeDrawing(Polyline);
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

    const newPoint: Point = { time: param.time, price };

    this._addPoint(newPoint);

    if (this._previewDrawing == null) {
      this._addPoint(newPoint);
      this._addPreviewDrawing(this._points);
    }
	}

  private _onDblClick(param: MouseEventParams) {
		if (!this._drawing || !param.point || !param.time || !this._series) return;
		const price = this._series.coordinateToPrice(param.point.y);
		if (price === null) {
			return;
		}

    const newPoint: Point = { time: param.time, price };
		this._addPoint(newPoint);

    this._removePreviewDrawing();
    this._addNewDrawing(this._points);
    this.stopDrawing();
	}

	private _onMouseMove(param: MouseEventParams) {
		if (!this._drawing || !param.point || !param.time || !this._series) return;
		const price = this._series.coordinateToPrice(param.point.y);
		if (price === null) {
			return;
		}

    const newPoint: Point = { time: param.time, price };
		const lastPointIndex = this._points.length - 1;

		if (this._previewDrawing) {
			this._previewDrawing.updatePoint(newPoint, lastPointIndex);
		}
	}

	private _addPoint(p: Point) {
		this._points.push(p);
	}

	private _addNewDrawing(points: Point[]) {
		const drawing = new Polyline(points, { ...this._defaultOptions });
		this._drawings.push(drawing);
		ensureDefined(this._series).attachPrimitive(drawing);
	}

	private _removeDrawing(drawing: Polyline) {
		ensureDefined(this._series).detachPrimitive(drawing);
	}

	private _addPreviewDrawing(points: Point[]) {
		this._previewDrawing = new PreviewPolyline(points, {
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
