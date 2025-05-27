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
  PrimitiveHoveredItem,
} from 'lightweight-charts';
import { DrawingBase, DrawingToolBase, RectangleAxisPaneRenderer, type Point, type ViewPoint } from './drawing-base.ts';
import { Point as Point2D } from '@flatten-js/core';
import { calculateDrawingPoint, convertViewPointToPoint2D } from './conversion-helper.ts';


class TimeLinePaneRenderer implements IPrimitivePaneRenderer {
  _points: ViewPoint[];
  _options: TimeLineOptions;

  constructor(points: ViewPoint[], options: TimeLineOptions) {
    this._points = points;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      if (this._points.length < 1) {
        return;
      }

      const ctx = scope.context;

      for (let i = 0; i < this._points.length; i++) {
        this._points[i] = calculateDrawingPoint(this._points[i], scope);
      }

      const point: Point2D = convertViewPointToPoint2D(this._points[0]);

      ctx.lineWidth = this._options.width;
      ctx.strokeStyle = this._options.color;

      ctx.beginPath();
      ctx.moveTo(point.x, 0);
      ctx.lineTo(point.x, scope.bitmapSize.height);
      ctx.stroke();
    });
  }

  hitTest(x: number, _y: number): PrimitiveHoveredItem | null {
    if (this._points.length < 1) {
      return null;
    }

    const p0: Point2D = convertViewPointToPoint2D(this._points[0]);

    const tolerance: number = 3e-0;
    const hit: boolean = Math.abs(x - p0.x) < tolerance;

    if (hit) {
      return {
        cursorStyle: "grab",
        externalId: 'time-line-drawing',
        zOrder: 'top',
      };
    } else {
      return null;
    }
  }

  // hitTest(x: number, y: number): PrimitiveHoveredItem | null {
  //   if (this._points.length < 2) {
  //     return;
  //   }
  //   const vertex1: Point2D = new Point2D(this._points[0].x, this._points[0].y);

  //   const currPoint = new Point2D(x, y);
  //   const segment: Segment = new Segment(vertex1, vertex2);

  //   const tolerance: number = 3e-0;
  //   const hit = segment.distanceTo(currPoint)[0] < tolerance ? true : false;

  //   if (!hit) {
  //     return null;
  //   }

  //   return {
  //     cursorStyle: "grab",
  //     externalId: 'time-line-drawing',
  //     zOrder: 'top',
  //   };
  // }
}

class TimeLinePaneView implements IPrimitivePaneView {
  _source: TimeLine;
  _points: Point[];
  _drawingPoints: ViewPoint[];

  constructor(source: TimeLine) {
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
    return new TimeLinePaneRenderer(
      this._drawingPoints,
      this._source._options,
    );
  }
}

abstract class TimeLineAxisPaneView implements IPrimitivePaneView {
  _source: TimeLine;
  _minPoint: number | null = null;
  _maxPoint: number | null = null;
  _vertical: boolean = false;

  constructor(source: TimeLine, vertical: boolean) {
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
      this._source._options.color,
      this._vertical
    );
  }
  zOrder(): PrimitivePaneViewZOrder {
    return 'bottom';
  }
}

class TimeLinePriceAxisPaneView extends TimeLineAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const series = this._source.series;
    const y1 = series.priceToCoordinate(this._source._bounds._minPrice ?? 0);
    const y2 = series.priceToCoordinate(this._source._bounds._maxPrice ?? 0);
    return [y1, y2];
  }
}

class FibWedgeTimeAxisPaneView extends TimeLineAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const timeScale = this._source.chart.timeScale();

    const x1 = timeScale.timeToCoordinate(this._source._bounds._minTime as Time);
    const x2 = timeScale.timeToCoordinate(this._source._bounds._maxTime as Time);
    return [x1, x2];
  }
}

abstract class TimeLineAxisView implements ISeriesPrimitiveAxisView {
  _source: TimeLine;
  _p: Point;
  _pos: Coordinate | null = null;
  constructor(source: TimeLine, p: Point) {
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

class TimeLineTimeAxisView extends TimeLineAxisView {
  update() {
    const timeScale = this._source.chart.timeScale();
    this._pos = timeScale.timeToCoordinate(this._p.time);
  }
  text() {
    return this._source._options.timeLabelFormatter(this._p.time);
  }
}

class TimeLinePriceAxisView extends TimeLineAxisView {
  update() {
    const series = this._source.series;
    this._pos = series.priceToCoordinate(this._p.price);
  }
  text() {
    return this._source._options.priceLabelFormatter(this._p.price);
  }
}

export interface TimeLineOptions {
  color: string;
  labelText: string;
  width: number;
  labelBackgroundColor: string;
  labelTextColor: string;
  showLabels: boolean;
  priceLabelFormatter: (price: number) => string;
  timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: TimeLineOptions = {
  color: 'green',
  labelText: '',
  width: 4,
  labelBackgroundColor: 'green',
  labelTextColor: 'white',
  showLabels: false,
  priceLabelFormatter: (price: number) => price.toFixed(3), // => price.toFixed(2),
  timeLabelFormatter: (time: Time) => {
    if (typeof time == 'string') return time;
    const date = isBusinessDay(time)
      ? new Date(time.year, time.month, time.day)
      : new Date(time * 1000);
    return date.toLocaleDateString();
  },
};

class TimeLine extends DrawingBase<TimeLineOptions> {
  _paneViews: TimeLinePaneView[];
  _timeAxisViews: TimeLineTimeAxisView[] = [];
  _priceAxisViews: TimeLinePriceAxisView[] = [];
  _priceAxisPaneViews: TimeLinePriceAxisPaneView[];
  _timeAxisPaneViews: FibWedgeTimeAxisPaneView[];

  constructor(
    points: Point[],
    options: Partial<TimeLineOptions> = {}
  ) {
    super(points, defaultOptions, options);

    this._paneViews = [new TimeLinePaneView(this)];
    points.forEach(point => {
      this._timeAxisViews.push(new TimeLineTimeAxisView(this, point));
      this._priceAxisViews.push(new TimeLinePriceAxisView(this, point));
    });
    this._priceAxisPaneViews = [new TimeLinePriceAxisPaneView(this, true)];
    this._timeAxisPaneViews = [new FibWedgeTimeAxisPaneView(this, false)];
  }

  public override addPoint(p: Point) {
    this._updateDrawingBounds(p);
    this._points.push(p);
    this._timeAxisViews.push(new TimeLineTimeAxisView(this, p));
    this._priceAxisViews.push(new TimeLinePriceAxisView(this, p));
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

  applyOptions(options: Partial<TimeLineOptions>) {
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

class TimeLinePreview extends TimeLine {
  constructor(
    points: Point[],
    options: Partial<TimeLineOptions> = {}
  ) {
    super(points, options);
    this._options.color = this._options.color;
  }
}

export class TimeLineDrawingTool extends DrawingToolBase<
  DrawingBase<TimeLineOptions>,
  DrawingBase<TimeLineOptions>,
  TimeLineOptions> {
  constructor(
    chart: IChartApi,
    series: ISeriesApi<SeriesType>,
    options: Partial<TimeLineOptions>
  ) {
    super(TimeLine, TimeLinePreview, chart, series, defaultOptions, options);
  }

  protected override _onClick(param: MouseEventParams) {
    if (!this._drawing || !param.point || !param.time || !this._series) return;
    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) {
      return;
    }

    const newPoint: Point = { time: param.time, price };
    this._addPointToCache(newPoint);
    this._addNewDrawing(this._pointsCache.slice(0, 1));
    this.stopDrawing();
  }
}
