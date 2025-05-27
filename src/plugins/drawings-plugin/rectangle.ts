import { CanvasRenderingTarget2D } from "fancy-canvas";
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

import { isBusinessDay } from "lightweight-charts";

import {
  DrawingBase,
  DrawingToolBase,
  RectangleAxisPaneRenderer,
  type Point,
  type ViewPoint,
} from "./drawing-base.ts";

import { CollisionHelper } from "./collision-helper.ts";
import { Box, Point as Point2D } from "@flatten-js/core";
import { calculateDrawingPoint, convertToPrice, convertViewPointToPoint2D } from "./conversion-helper.ts";
class RectanglePaneRenderer implements IPrimitivePaneRenderer {
  _points: ViewPoint[];
  _options: RectangleOptions;

  constructor(points: ViewPoint[], options: RectangleOptions) {
    this._points = points;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope) => {
      if (this._points.length < 2) {
        return;
      }

      const ctx = scope.context;

      const p0: Point2D = convertViewPointToPoint2D(calculateDrawingPoint(this._points[0], scope));
      const p1: Point2D = convertViewPointToPoint2D(calculateDrawingPoint(this._points[1], scope));
      ctx.fillStyle = this._options.fillColor;
      ctx.fillRect(
        Math.min(p0.x, p1.x),
        Math.min(p0.y, p1.y),
        Math.abs(p0.x - p1.x),
        Math.abs(p0.y - p1.y));
    });
  }
  hitTest(x: number, y: number): PrimitiveHoveredItem | null {
    if (this._points.length < 2) {
			return null;
    }

    const hitTestPoint: Point2D = new Point2D(x, y);

    const p0: Point2D = convertViewPointToPoint2D(this._points[0]);
    const p1: Point2D = convertViewPointToPoint2D(this._points[1]);

    const bb: Box = new Box(
      Math.min(p0.x, p1.x),
      Math.min(p0.y, p1.y),
      Math.max(p0.x, p1.x),
      Math.max(p0.y, p1.y),
    )

    const hit: boolean = CollisionHelper.IsPointInRectangle(hitTestPoint, bb);

    if (hit) {
      return {
        cursorStyle: "grab",
        externalId: "rectangle-drawing",
        zOrder: "top",
      };
    } else {
      return null;
    }
  }
}

class RectanglePaneView implements IPrimitivePaneView {
  _source: Rectangle;
  _points: Point[];
  _drawingPoints: ViewPoint[];

  constructor(source: Rectangle) {
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
    return new RectanglePaneRenderer(
      this._drawingPoints,
      this._source._options
    );
  }
}
abstract class RectangleAxisPaneView implements IPrimitivePaneView {
  _source: Rectangle;
  _minPoint: number | null = null;
  _maxPoint: number | null = null;
  _vertical: boolean = false;

  constructor(source: Rectangle, vertical: boolean) {
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

class RectanglePriceAxisPaneView extends RectangleAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const series = this._source.series;
    const y1 = series.priceToCoordinate(convertToPrice(this._source._bounds._minPrice));
    const y2 = series.priceToCoordinate(convertToPrice(this._source._bounds._maxPrice));
    return [y1, y2];
  }
}

class RectangleTimeAxisPaneView extends RectangleAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const timeScale = this._source.chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._source._bounds._minTime as Time);
    const x2 = timeScale.timeToCoordinate(this._source._bounds._maxTime as Time);
    return [x1, x2];
  }
}

abstract class RectangleAxisView implements ISeriesPrimitiveAxisView {
  _source: Rectangle;
  _p: Point;
  _pos: Coordinate | null = null;
  constructor(source: Rectangle, p: Point) {
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

export interface RectangleOptions {
  fillColor: string;
  lineColor: string;
  previewFillColor: string;
  labelColor: string;
  labelTextColor: string;
  showLabels: boolean;
  priceLabelFormatter: (price: number) => string;
  timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: RectangleOptions = {
  fillColor: "rgba(200, 50, 100, 0.75)",
  lineColor: "rgba(115, 0, 255, 0.75)",
  previewFillColor: "rgba(200, 50, 100, 0.25)",
  labelColor: "rgba(200, 50, 100, 1)",
  labelTextColor: "white",
  showLabels: true,
  priceLabelFormatter: (price: number) => price.toFixed(2),
  timeLabelFormatter: (time: Time) => {
    if (typeof time == "string") return time;
    const date = isBusinessDay(time)
      ? new Date(time.year, time.month, time.day)
      : new Date(time * 1000);
    return date.toLocaleDateString();
  },
};

class Rectangle extends DrawingBase<RectangleOptions> {
  _paneViews: RectanglePaneView[];
  _timeAxisViews: RectangleTimeAxisView[] = [];
  _priceAxisViews: RectanglePriceAxisView[] = [];
  _priceAxisPaneViews: RectanglePriceAxisPaneView[];
  _timeAxisPaneViews: RectangleTimeAxisPaneView[];

  constructor(points: Point[], options: Partial<RectangleOptions> = {}) {
    super(points, defaultOptions, options);

    this._paneViews = [new RectanglePaneView(this)];
    points.forEach((point) => {
      this._timeAxisViews.push(new RectangleTimeAxisView(this, point));
      this._priceAxisViews.push(new RectanglePriceAxisView(this, point));
    });
    this._priceAxisPaneViews = [new RectanglePriceAxisPaneView(this, true)];
    this._timeAxisPaneViews = [new RectangleTimeAxisPaneView(this, false)];
  }

  public override addPoint(p: Point) {
    this._updateDrawingBounds(p);
    this._points.push(p);
    this._timeAxisViews.push(new RectangleTimeAxisView(this, p));
    this._priceAxisViews.push(new RectanglePriceAxisView(this, p));
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

  applyOptions(options: Partial<RectangleOptions>) {
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

class RectanglePreview extends Rectangle {
  constructor(points: Point[], options: Partial<RectangleOptions> = {}) {
    super(points, options);
    this._options.fillColor = this._options.previewFillColor;
  }
}

export class RectangleDrawingTool extends DrawingToolBase<
  DrawingBase<RectangleOptions>,
  DrawingBase<RectangleOptions>,
  RectangleOptions
> {
  constructor(
    chart: IChartApi,
    series: ISeriesApi<SeriesType>,
    options: Partial<RectangleOptions>
  ) {
    super(Rectangle, RectanglePreview, chart, series, defaultOptions, options);
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
