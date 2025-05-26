import type { CanvasRenderingTarget2D } from "fancy-canvas";

import { isBusinessDay } from "lightweight-charts";
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
} from "lightweight-charts";
import {
  DrawingBase,
  DrawingToolBase,
  RectangleAxisPaneRenderer,
  type Point,
  type ViewPoint,
} from "./drawing-base.ts";
import { Point as Point2D } from "@flatten-js/core";
import { CollisionHelper } from "./collision-helper.ts";
import { calculateDrawingPoint, convertViewPointToPoint2D } from "./conversion-helper.ts";

class TrianglePaneRenderer implements IPrimitivePaneRenderer {
  _points: ViewPoint[];
  _options: TriangleOptions;

  constructor(points: ViewPoint[], options: TriangleOptions) {
    this._points = points;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope) => {
      if (this._points.length < 2) {
        return;
      }

      const ctx = scope.context;

      const drawingPoints: Point2D[] = [];
      this._points.forEach((it) => {
        drawingPoints.push(convertViewPointToPoint2D(calculateDrawingPoint(it, scope)));
      });

      if (drawingPoints.length < 3) {
        ctx.beginPath();
        ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
        ctx.lineTo(drawingPoints[2].x, drawingPoints[1].y);
        ctx.strokeStyle = this._options.lineColor;
        ctx.lineWidth = scope.verticalPixelRatio;
        ctx.stroke();
      } else {
        ctx.fillStyle = this._options.fillColor;
        ctx.strokeStyle = this._options.lineColor;
        ctx.lineWidth = scope.verticalPixelRatio;
        ctx.beginPath();
        ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
        ctx.lineTo(drawingPoints[1].x, drawingPoints[1].y);
        ctx.lineTo(drawingPoints[2].x, drawingPoints[2].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    });
  }

  hitTest(x: number, y: number): PrimitiveHoveredItem | null {
    if (this._points.length < 3) {
      return null;
    }

    const hitTestPoint: Point2D = new Point2D(x, y);

    const polygonPoints: Point2D[] = [
          convertViewPointToPoint2D(this._points[0]),
          convertViewPointToPoint2D(this._points[1]),
          convertViewPointToPoint2D(this._points[2]),
    ];

    const hit: boolean = CollisionHelper.IsPointInPolygon(hitTestPoint, polygonPoints)

    if (hit) {
      return {
        cursorStyle: "grab",
        externalId: "triangle-drawing",
        zOrder: "top",
      };
    } else {
      return null;
    }
  }
}

class TrianglePaneView implements IPrimitivePaneView {
  _source: Triangle;
  _points: Point[];
  _drawingPoints: ViewPoint[];

  constructor(source: Triangle) {
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
    return new TrianglePaneRenderer(
      this._drawingPoints,
      this._source._options,
    );
  }
}

abstract class TriangleAxisPaneView implements IPrimitivePaneView {
  _source: Triangle;
  _minPoint: number | null = null;
  _maxPoint: number | null = null;
  _vertical: boolean = false;

  constructor(source: Triangle, vertical: boolean) {
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
    return "bottom";
  }
}

class TrianglePriceAxisPaneView extends TriangleAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const series = this._source.series;
    const y1 = series.priceToCoordinate(this._source._bounds._minPrice as number);
    const y2 = series.priceToCoordinate(this._source._bounds._maxPrice as number);
    return [y1, y2];
  }
}

class TriangleTimeAxisPaneView extends TriangleAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const timeScale = this._source.chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._source._bounds._minTime as Time);
    const x2 = timeScale.timeToCoordinate(this._source._bounds._maxTime as Time);
    return [x1, x2];
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

export interface TriangleOptions {
  fillColor: string;
  previewFillColor: string;
  lineColor: string;
  lineWidth: number,
  labelColor: string;
  labelTextColor: string;
  showLabels: boolean;
  priceLabelFormatter: (price: number) => string;
  timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: TriangleOptions = {
  fillColor: "rgba(234, 116, 19, 0.61)",
  previewFillColor: "rgba(234, 116, 19, 0.36)",
  lineColor: "rgba(21, 0, 255, 0.85)",
  lineWidth: 3,
  labelColor: "rgba(234, 116, 19, 0.74)",
  labelTextColor: "white",
  showLabels: true,
  priceLabelFormatter: (price: number) => price.toFixed(3), // => price.toFixed(2),
  timeLabelFormatter: (time: Time) => {
    if (typeof time == "string") return time;
    const date = isBusinessDay(time)
      ? new Date(time.year, time.month, time.day)
      : new Date(time * 1000);
    return date.toLocaleDateString();
  },
};

class Triangle extends DrawingBase<TriangleOptions> {
  _paneViews: TrianglePaneView[];
  _timeAxisViews: TriangleTimeAxisView[] = [];
  _priceAxisViews: TrianglePriceAxisView[] = [];
  _priceAxisPaneViews: TrianglePriceAxisPaneView[];
  _timeAxisPaneViews: TriangleTimeAxisPaneView[];

  constructor(points: Point[], options: Partial<TriangleOptions> = {}) {
    super(points, defaultOptions, options);

    this._paneViews = [new TrianglePaneView(this)];
    points.forEach((point) => {
      this._timeAxisViews.push(new TriangleTimeAxisView(this, point));
      this._priceAxisViews.push(new TrianglePriceAxisView(this, point));
    });
    this._priceAxisPaneViews = [new TrianglePriceAxisPaneView(this, true)];
    this._timeAxisPaneViews = [new TriangleTimeAxisPaneView(this, false)];
  }

  public override addPoint(p: Point) {
    this._updateDrawingBounds(p);
    this._points.push(p);
    this._timeAxisViews.push(new TriangleTimeAxisView(this, p));
    this._priceAxisViews.push(new TrianglePriceAxisView(this, p));
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

  applyOptions(options: Partial<TriangleOptions>) {
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

class TrianglePreview extends Triangle {
  constructor(points: Point[], options: Partial<TriangleOptions> = {}) {
    super(points, options);
    this._options.fillColor = this._options.previewFillColor;
  }
}
export class TriangleDrawingTool extends DrawingToolBase<
  DrawingBase<TriangleOptions>,
  DrawingBase<TriangleOptions>,
  TriangleOptions
> {
  constructor(
    chart: IChartApi,
    series: ISeriesApi<SeriesType>,
    options: Partial<TriangleOptions>
  ) {
    super(Triangle, TrianglePreview, chart, series, defaultOptions, options);
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
