
import type { CanvasRenderingTarget2D } from 'fancy-canvas';

import type {
  Coordinate,
  IChartApi,
  ISeriesApi,
  MouseEventParams,
  SeriesType,
  Time,
  PrimitiveHoveredItem,
  IPrimitivePaneRenderer,
} from 'lightweight-charts';

import { ChartInstrumentBase } from '../chart-instrument-base.ts';
import { ensureDefined } from '../../helpers/assertions.ts';
import { positionsBox } from '../../helpers/dimensions/positions.ts';

export interface ViewPoint {
  x: Coordinate | null;
  y: Coordinate | null;
}

export interface Point {
  time: Time;
  price: number;
}

export interface DrawingBounds {
  _minTime: number | null;
  _maxTime: number | null;
  _minPrice: number | null;
  _maxPrice: number | null;
}

export class RectangleAxisPaneRenderer implements IPrimitivePaneRenderer {
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


export class DrawingBase<DrawingOptions> extends ChartInstrumentBase {
  _options: DrawingOptions;
  _points: Point[];
  _bounds: DrawingBounds;

  constructor(
    points: Point[],
    defaultOptions: DrawingOptions,
    options: Partial<DrawingOptions> = {}
  ) {
    super();
    this._points = points;

    this._bounds = { _minTime: null, _maxTime: null, _minPrice: null, _maxPrice: null };
    this._points.forEach((point) => {
      this._updateDrawingBounds(point);
    })

    this._options = {
      ...defaultOptions,
      ...options,
    };
  }

  public addPoint(p: Point) {
    this._updateDrawingBounds(p);
    this._points.push(p);
    this.requestUpdate();
  }

  public updatePoint(p: Point, index: number) {
    if (index >= this._points.length || index < 0)
      return;

    this._points[index] = p;
    this.requestUpdate();
  }

  applyOptions(options: Partial<DrawingOptions>) {
    this._options = { ...this._options, ...options };
    this.requestUpdate();
  }

  hitTest(_x: number, _y: number): PrimitiveHoveredItem | null {
    return null;
  }

  protected _updateDrawingBounds(point: Point) {
    this._bounds._minPrice = this._bounds._minPrice == null ? point.price as number : Math.min(this._bounds._minPrice, point.price) as number;
    this._bounds._maxPrice = this._bounds._maxPrice == null ? point.price as number : Math.max(this._bounds._maxPrice, point.price) as number;

    this._bounds._minTime = this._bounds._minTime == null ? point.time as number: Math.min(this._bounds._minTime, point.time as number) as number;
    this._bounds._maxTime = this._bounds._maxTime == null ? point.time as number: Math.max(this._bounds._maxTime, point.time as number) as number;
  }
}

export type DrawingConstructor<TOptions, TDrawing extends DrawingBase<TOptions>> =
  new (points: Point[], defaults: TOptions, options: Partial<TOptions>) => TDrawing;

export class DrawingToolBase<
  TDrawing extends DrawingBase<TOptions>,
  TPreviewDrawing extends DrawingBase<TOptions>,
  TOptions,
> {
  protected _chart: IChartApi | undefined;
  protected _series: ISeriesApi<SeriesType> | undefined;
  protected _defaultOptions: TOptions;
  protected _options: Partial<TOptions>;
  protected _drawings: TDrawing[];
  protected _previewDrawing: TPreviewDrawing | undefined = undefined;
  protected _pointsCache: Point[] = [];
  protected _drawing: boolean = false;

  constructor(
    private DrawingClass: DrawingConstructor<TOptions, TDrawing>,
    private PreviewDrawingClass: DrawingConstructor<TOptions, TPreviewDrawing>,
    chart: IChartApi,
    series: ISeriesApi<SeriesType>,
    defaultOptions: TOptions,
    options: Partial<TOptions>
  ) {
    this._chart = chart;
    this._series = series;
    this._defaultOptions = defaultOptions;
    this._options = options;
    this._drawings = [];
    this._chart.subscribeClick(this._clickHandler);
    this._chart.subscribeDblClick(this._dblClickHandler);
    this._chart.subscribeCrosshairMove(this._moveHandler);
  }

  protected _clickHandler = (param: MouseEventParams) => this._onClick(param);
  protected _dblClickHandler = (param: MouseEventParams) => this._onDblClick(param);
  protected _moveHandler = (param: MouseEventParams) => this._onMouseMove(param);

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
    this._pointsCache = [];
  }

  stopDrawing(): void {
    this._drawing = false;
    this._pointsCache = [];
  }

  isDrawing(): boolean {
    return this._drawing;
  }

  protected _onClick(param: MouseEventParams) {
    if (!this._drawing || !param.point || !param.time || !this._series) return;
    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) {
      return;
    }
    const newPoint: Point = { time: param.time, price };

    if (this._previewDrawing == null) {
      this._addPointToCache(newPoint);
      this._addPointToCache(newPoint);
      this._addPreviewDrawing(this._getCachedPoints());
    } else {
      this._addPointToCache(newPoint);
      this._previewDrawing.addPoint(newPoint);
    }
  }

  protected _onDblClick(_param: MouseEventParams) {
    return;
  }

  protected _onMouseMove(param: MouseEventParams) {
    if (!this._drawing || !param.point || !param.time || !this._series) return;
    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) {
      return;
    }

    const newPoint: Point = { time: param.time, price };
    const lastPointIndex = this._getCachedPoints().length - 1;
    this._getCachedPoints()[lastPointIndex] = newPoint;

    if (this._previewDrawing) {
      this._previewDrawing?.updatePoint(newPoint, lastPointIndex);
    }
  }

  protected _addPointToCache(p: Point) {
    this._pointsCache.push(p);
  }

  protected _getCachedPoints(): Point[] {
    return this._pointsCache;
  }

  protected _addNewDrawing(points: Point[]) {
    const clonnedPoints: Point[] = [];
    points.forEach(val => clonnedPoints.push(Object.assign({}, val)));

    const drawing = new this.DrawingClass(
      clonnedPoints,
      this._defaultOptions,
      { ...this._options },
    );
    this._drawings.push(drawing);
    ensureDefined(this._series).attachPrimitive(drawing);
  }

  protected _removeDrawing(drawing: TDrawing) {
    ensureDefined(this._series).detachPrimitive(drawing);
  }

  protected _addPreviewDrawing(points: Point[]) {
    const clonnedPoints: Point[] = [];
    points.forEach(val => clonnedPoints.push(Object.assign({}, val)));

    this._previewDrawing = new this.PreviewDrawingClass(
      clonnedPoints,
      this._defaultOptions,
      { ...this._options },
    );
    ensureDefined(this._series).attachPrimitive(this._previewDrawing);
  }

  protected _removePreviewDrawing() {
    if (this._previewDrawing) {
      ensureDefined(this._series).detachPrimitive(this._previewDrawing);
      this._previewDrawing = undefined;
    }
  }
}
