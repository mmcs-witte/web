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
} from 'lightweight-charts';

import { isBusinessDay } from 'lightweight-charts';

import { ensureDefined } from '../../helpers/assertions.ts';
import { PluginBase } from '../plugin-base.ts';
import { positionsBox } from '../../helpers/dimensions/positions.ts';
import { RectangleAxisPaneRenderer, type Point, type ViewPoint } from './drawing-base.ts';

class TrendLinePaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _text1: string;
  _text2: string;
  _options: TrendLineOptions;

  constructor(p1: ViewPoint, p2: ViewPoint, text1: string, text2: string, options: TrendLineOptions) {
    this._p1 = p1;
    this._p2 = p2;
    this._text1 = text1;
    this._text2 = text2;
    this._options = options;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(scope => {
      if (
        this._p1.x === null ||
        this._p1.y === null ||
        this._p2.x === null ||
        this._p2.y === null
      )
        return;
      const ctx = scope.context;
      const x1Scaled = Math.round(this._p1.x * scope.horizontalPixelRatio);
      const y1Scaled = Math.round(this._p1.y * scope.verticalPixelRatio);
      const x2Scaled = Math.round(this._p2.x * scope.horizontalPixelRatio);
      const y2Scaled = Math.round(this._p2.y * scope.verticalPixelRatio);
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
}

abstract class TrendLineAxisPaneView implements IPrimitivePaneView {
  _source: TrendLine;
  _p1: number | null = null;
  _p2: number | null = null;
  _vertical: boolean = false;

  constructor(source: TrendLine, vertical: boolean) {
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
      this._source._options.labelBackgroundColor,
      this._vertical
    );
  }
  zOrder(): PrimitivePaneViewZOrder {
    return 'bottom';
  }
}

class RectanglePriceAxisPaneView extends TrendLineAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const series = this._source.series;
    const y1 = series.priceToCoordinate(this._source._p1.price);
    const y2 = series.priceToCoordinate(this._source._p2.price);
    return [y1, y2];
  }
}

class RectangleTimeAxisPaneView extends TrendLineAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const timeScale = this._source.chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._source._p1.time);
    const x2 = timeScale.timeToCoordinate(this._source._p2.time);
    return [x1, x2];
  }
}

abstract class TrendLineAxisView implements ISeriesPrimitiveAxisView {
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

class RectangleTimeAxisView extends TrendLineAxisView {
  update() {
    const timeScale = this._source.chart.timeScale();
    this._pos = timeScale.timeToCoordinate(this._p.time);
  }
  text() {
    return this._source._options.timeLabelFormatter(this._p.time);
  }
}

class RectanglePriceAxisView extends TrendLineAxisView {
  update() {
    const series = this._source.series;
    this._pos = series.priceToCoordinate(this._p.price);
  }
  text() {
    return this._source._options.priceLabelFormatter(this._p.price);
  }
}

class TrendLinePaneView implements IPrimitivePaneView {
  _source: TrendLine;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };

  constructor(source: TrendLine) {
    this._source = source;
  }

  update() {
    const series = this._source._series;
    const y1 = series.priceToCoordinate(this._source._p1.price);
    const y2 = series.priceToCoordinate(this._source._p2.price);
    const timeScale = this._source._chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._source._p1.time);
    const x2 = timeScale.timeToCoordinate(this._source._p2.time);
    this._p1 = { x: x1, y: y1 };
    this._p2 = { x: x2, y: y2 };
  }

  renderer() {
    return new TrendLinePaneRenderer(
      this._p1,
      this._p2,
      '' + this._source._p1.price.toFixed(1),
      '' + this._source._p2.price.toFixed(1),
      this._source._options
    );
  }
}


export interface TrendLineOptions {
  lineColor: string;
  previewlineColor: string;
  width: number;
  showLabels: boolean;
  labelBackgroundColor: string;
  labelTextColor: string;
  priceLabelFormatter: (price: number) => string;
  timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: TrendLineOptions = {
  lineColor: 'rgba(222, 15, 15, 0.96)',
  previewlineColor: 'rgba(222, 15, 15, 0.7)',
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

export class TrendLine extends PluginBase {
  _p1: Point;
  _p2: Point;
  _paneViews: TrendLinePaneView[];
  _timeAxisViews: RectangleTimeAxisView[];
  _priceAxisViews: RectanglePriceAxisView[];
  _priceAxisPaneViews: RectanglePriceAxisPaneView[];
  _timeAxisPaneViews: RectangleTimeAxisPaneView[];
  _options: TrendLineOptions;
  _minPrice: number;
  _maxPrice: number;

  constructor(
    p1: Point,
    p2: Point,
    options?: Partial<TrendLineOptions>
  ) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._minPrice = Math.min(this._p1.price, this._p2.price);
    this._maxPrice = Math.max(this._p1.price, this._p2.price);
    this._options = {
      ...defaultOptions,
      ...options,
    };
    this._paneViews = [new TrendLinePaneView(this)];
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

  applyOptions(options: Partial<TrendLineOptions>) {
    this._options = { ...this._options, ...options };
    this.requestUpdate();
  }
}

class PreviewTrendLine extends TrendLine {
  constructor(
    p1: Point,
    p2: Point,
    options: Partial<TrendLineOptions> = {}
  ) {
    super(p1, p2, options);
    this._options.lineColor = this._options.previewlineColor;
  }

  public updateEndPoint(p: Point) {
    this._p2 = p;
    this._paneViews[0].update();
    this._timeAxisViews[1].movePoint(p);
    this._priceAxisViews[1].movePoint(p);
    this.requestUpdate();
  }
}

export class TrendLineDrawingTool {
  private _chart: IChartApi | undefined;
  private _series: ISeriesApi<SeriesType> | undefined;
  private _defaultOptions: Partial<TrendLineOptions>;
  private _drawings: TrendLine[];
  private _previewDrawing: PreviewTrendLine | undefined = undefined;
  private _points: Point[] = [];
  private _drawing: boolean = false;

  constructor(
    chart: IChartApi,
    series: ISeriesApi<SeriesType>,
    options: Partial<TrendLineOptions>
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
    this._drawings.forEach(triangle => {
      this._removeTrendline(triangle);
    });
    this._drawings = [];
    this._removePreviewTrendline();
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
      price
    });
  }

  private _onMouseMove(param: MouseEventParams) {
    if (!this._drawing || !param.point || !param.time || !this._series) return;
    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) {
      return;
    }

    if (this._previewDrawing) {
      this._previewDrawing.updateEndPoint(
        {
          time: param.time,
          price,
        });
    }
  }

  private _addPoint(p: Point) {
    this._points.push(p);
    if (this._points.length > 1) {
      this._addNewTrendLine(this._points[0], this._points[1]);
      this.stopDrawing();
      this._removePreviewTrendline();
    }
    if (this._points.length === 1) {
      this._addPreviewTrendline(this._points[0]);
    }
  }

  private _addNewTrendLine(p1: Point, p2: Point) {
    const triangle = new TrendLine(p1, p2, { ...this._defaultOptions });
    this._drawings.push(triangle);
    ensureDefined(this._series).attachPrimitive(triangle);
  }

  private _removeTrendline(triangle: TrendLine) {
    ensureDefined(this._series).detachPrimitive(triangle);
  }

  private _addPreviewTrendline(p: Point) {
    this._previewDrawing = new PreviewTrendLine(p, p, {
      ...this._defaultOptions,
    });
    ensureDefined(this._series).attachPrimitive(this._previewDrawing);
  }

  private _removePreviewTrendline() {
    if (this._previewDrawing) {
      ensureDefined(this._series).detachPrimitive(this._previewDrawing);
      this._previewDrawing = undefined;
    }
  }
}
