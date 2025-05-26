import type { BitmapCoordinatesRenderingScope, CanvasRenderingTarget2D } from 'fancy-canvas';
import type {
  Coordinate,
  IChartApi,
  ISeriesApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesPrimitiveAxisView,
  PrimitivePaneViewZOrder,
  MouseEventParams,
  SeriesType,
  Time,
  PrimitiveHoveredItem,
} from 'lightweight-charts';

import { isBusinessDay } from 'lightweight-charts';
import { DrawingBase, DrawingToolBase, RectangleAxisPaneRenderer, type Point, type ViewPoint } from './drawing-base.ts';
import { Point as Point2D, Segment } from '@flatten-js/core';
import { convertViewPointToPoint2D, convertToPrice, calculateDrawingPoint } from './conversion-helper.ts';

class TrendLinePaneRenderer implements IPrimitivePaneRenderer {
  _points: ViewPoint[];
  _text1: string;
  _text2: string;
  _options: TrendLineOptions;

  constructor(points: ViewPoint[], text1: string, text2: string, options: TrendLineOptions) {
    this._points = points;
    this._text1 = text1;
    this._text2 = text2;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope) => {
      if (this._points.length < 2) {
        return;
      }

      const ctx = scope.context;
      const p1: Point2D = convertViewPointToPoint2D(calculateDrawingPoint(this._points[0], scope));
      const p2: Point2D = convertViewPointToPoint2D(calculateDrawingPoint(this._points[1], scope));

      const x1Scaled = Math.round(p1.x);
      const y1Scaled = Math.round(p1.y);
      const x2Scaled = Math.round(p2.x);
      const y2Scaled = Math.round(p2.y);
      ctx.lineWidth = this._options.width;
      ctx.strokeStyle = this._options.lineColor;
      ctx.beginPath();
      ctx.moveTo(x1Scaled, y1Scaled);
      ctx.lineTo(x2Scaled, y2Scaled);
      ctx.stroke();
      if (this._options.showLabels) {
        this._drawTextLabel(scope, this._text1, x1Scaled, y1Scaled, true);
        this._drawTextLabel(scope, this._text2, x2Scaled, y2Scaled, false);
      }
    });
  }

  _drawTextLabel(scope: BitmapCoordinatesRenderingScope, text: string, x: number, y: number, left: boolean) {
    scope.context.font = '24px Arial';
    scope.context.beginPath();
    const offset = 5 * scope.horizontalPixelRatio;
    const textWidth = scope.context.measureText(text);
    const leftAdjustment = left ? textWidth.width + offset * 4 : 0;
    scope.context.fillStyle = this._options.labelBackgroundColor;
    scope.context.roundRect(x + offset - leftAdjustment, y - 24, textWidth.width + offset * 2, 24 + offset, 5);
    scope.context.fill();
    scope.context.beginPath();
    scope.context.fillStyle = this._options.labelTextColor;
    scope.context.fillText(text, x + offset * 2 - leftAdjustment, y);
  }

  hitTest(x: number, y: number): PrimitiveHoveredItem | null {
    if (this._points.length < 2) {
      return null;
    }
    const vertex1: Point2D = convertViewPointToPoint2D(this._points[0]);
    const vertex2: Point2D = convertViewPointToPoint2D(this._points[1]);
    const currPoint = new Point2D(x, y);
    const segment: Segment = new Segment(vertex1, vertex2);

    const tolerance: number = 3e-0;
    const hit = segment.distanceTo(currPoint)[0] < tolerance ? true : false;

    if (!hit) {
      return null;
    }

    return {
      cursorStyle: "grab",
      externalId: 'trend-line-drawing',
      zOrder: 'top',
    };
  }
}

class TrendLinePaneView implements IPrimitivePaneView {
  _source: TrendLine;
  _points: Point[];
  _drawingPoints: ViewPoint[];

  constructor(source: TrendLine) {
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
    return new TrendLinePaneRenderer(
      this._drawingPoints,
      '' + this._source._points[0].price.toFixed(1),
      '' + this._source._points[1].price.toFixed(1),
      this._source._options,
    );
  }
}
abstract class RectangleAxisPaneView implements IPrimitivePaneView {
  _source: TrendLine;
  _minPoint: number | null = null;
  _maxPoint: number | null = null;
  _vertical: boolean = false;

  constructor(source: TrendLine, vertical: boolean) {
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
    return "bottom";
  }
}

class TrendLinePriceAxisPaneView extends RectangleAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const series = this._source.series;
    const y1 = series.priceToCoordinate(convertToPrice(this._source._bounds._minPrice));
    const y2 = series.priceToCoordinate(convertToPrice(this._source._bounds._maxPrice));
    return [y1, y2];
  }
}

class TrendLineTimeAxisPaneView extends RectangleAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const timeScale = this._source.chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._source._bounds._minTime as Time);
    const x2 = timeScale.timeToCoordinate(this._source._bounds._maxTime as Time);
    return [x1, x2];
  }
}

abstract class RectangleAxisView implements ISeriesPrimitiveAxisView {
  _source: TrendLine;
  _p: Point;
  _pos: Coordinate | null = null;
  constructor(source: TrendLine, p: Point) {
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
    return this._source._options.labelBackgroundColor;
  }
  movePoint(p: Point) {
    this._p = p;
    this.update();
  }
}

class TrendLineTimeAxisView extends RectangleAxisView {
  update() {
    const timeScale = this._source.chart.timeScale();
    this._pos = timeScale.timeToCoordinate(this._p.time);
  }
  text() {
    return this._source._options.timeLabelFormatter(this._p.time);
  }
}

class TrendLinePriceAxisView extends RectangleAxisView {
  update() {
    const series = this._source.series;
    this._pos = series.priceToCoordinate(this._p.price);
  }
  text() {
    return this._source._options.priceLabelFormatter(this._p.price);
  }
}

export interface TrendLineOptions {
  lineColor: string;
  previewLineColor: string;
  width: number;
  showLabels: boolean;
  labelBackgroundColor: string;
  labelTextColor: string;
  priceLabelFormatter: (price: number) => string;
  timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: TrendLineOptions = {
  lineColor: 'rgba(222, 15, 15, 0.96)',
  previewLineColor: 'rgba(222, 15, 15, 0.7)',
  width: 6,
  showLabels: true,
  labelBackgroundColor: 'rgba(255, 255, 255, 0.85)',
  labelTextColor: 'rgb(245, 9, 9)',
  priceLabelFormatter: (price: number) => price.toFixed(2),
  timeLabelFormatter: (time: Time) => {
    if (typeof time == 'string') return time;
    const date = isBusinessDay(time)
      ? new Date(time.year, time.month, time.day)
      : new Date(time * 1000);
    return date.toLocaleDateString();
  },
};


class TrendLine extends DrawingBase<TrendLineOptions> {
  _paneViews: TrendLinePaneView[];
  _timeAxisViews: TrendLineTimeAxisView[] = [];
  _priceAxisViews: TrendLinePriceAxisView[] = [];
  _priceAxisPaneViews: TrendLinePriceAxisPaneView[];
  _timeAxisPaneViews: TrendLineTimeAxisPaneView[];

  constructor(points: Point[], options: Partial<TrendLineOptions> = {}) {
    super(points, defaultOptions, options);

    this._paneViews = [new TrendLinePaneView(this)];
    points.forEach((point) => {
      this._timeAxisViews.push(new TrendLineTimeAxisView(this, point));
      this._priceAxisViews.push(new TrendLinePriceAxisView(this, point));
    });
    this._priceAxisPaneViews = [new TrendLinePriceAxisPaneView(this, true)];
    this._timeAxisPaneViews = [new TrendLineTimeAxisPaneView(this, false)];
  }

  public override addPoint(p: Point) {
    this._updateDrawingBounds(p);
    this._points.push(p);
    this._timeAxisViews.push(new TrendLineTimeAxisView(this, p));
    this._priceAxisViews.push(new TrendLinePriceAxisView(this, p));
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

  applyOptions(options: Partial<TrendLineOptions>) {
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

class TrendLinePreview extends TrendLine {
  constructor(points: Point[], options: Partial<TrendLineOptions> = {}) {
    super(points, options);
    this._options.lineColor = this._options.previewLineColor;
  }
}

export class TrendLineDrawingTool extends DrawingToolBase<
  DrawingBase<TrendLineOptions>,
  DrawingBase<TrendLineOptions>,
  TrendLineOptions
> {
  constructor(
    chart: IChartApi,
    series: ISeriesApi<SeriesType>,
    options: Partial<TrendLineOptions>
  ) {
    super(TrendLine, TrendLinePreview, chart, series, defaultOptions, options);
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
