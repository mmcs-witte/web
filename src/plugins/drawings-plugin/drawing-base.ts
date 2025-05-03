
import type {
	IChartApi,
	ISeriesApi,
	MouseEventParams,
	SeriesType,
  Time,
} from 'lightweight-charts';

import { PluginBase } from '../plugin-base.ts';

import { ensureDefined } from '../../helpers/assertions.ts';

interface Point {
	time: Time;
	price: number;
}

export class IDrawingBase<DrawingOptions> extends PluginBase {
  _options: DrawingOptions;
  _points: Point[];

  constructor(
      points: Point[],
      defaultOptions: DrawingOptions,
      options: Partial<DrawingOptions> = {}
  ) {
    super();

    this._points = points;

    this._options = {
			...defaultOptions,
			...options,
		};
  }

  public addPoint(p: Point) {
    this._points.push(p);
    this.requestUpdate();
  }

	public updatePoint(p: Point, index : number) {
    if (index >= this._points.length || index < 0)
      return;

    this._points[index] = p;
		this.requestUpdate();
	}

  applyOptions(options: Partial<DrawingOptions>) {
    this._options = { ...this._options, ...options };
    this.requestUpdate();
  }

	// hitTest(x: number, y: number): PrimitiveHoveredItem | null {
	// 	if (this._paneView) {
	// 		return this._paneView.renderer()?.hitTest(x, y) ?? null;
	// 	}
	// 	return null;
  // }
}

type DrawingConstructor<TOptions, TDrawing extends IDrawingBase<TOptions>> =
  new (points: Point[], defaults: TOptions, options: Partial<TOptions>) => TDrawing;

export class DrawingToolBase<
  TDrawing extends IDrawingBase<TOptions>, 
  TPreviewDrawing extends IDrawingBase<TOptions>,
  TOptions,
  > {
  private _chart: IChartApi | undefined;
  private _series: ISeriesApi<SeriesType> | undefined;
  private _defaultOptions: TOptions;
  private _options: Partial<TOptions>;
  private _drawings: TDrawing[];
  private _previewDrawing: TPreviewDrawing | undefined = undefined;
  private _points: Point[] = [];
  private _drawing: boolean = false;

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
      this._previewDrawing?.updatePoint(newPoint, lastPointIndex);
    }
  }

  private _addPoint(p: Point) {
    this._points.push(p);
  }

  private _addNewDrawing(points: Point[]) {
    const drawing = new this.DrawingClass(
      points,
      this._defaultOptions,
      { ...this._options },
    );
    this._drawings.push(drawing);
    ensureDefined(this._series).attachPrimitive(drawing);
  }

  private _removeDrawing(drawing: TDrawing) {
    ensureDefined(this._series).detachPrimitive(drawing);
  }

  private _addPreviewDrawing(points: Point[]) {
    this._previewDrawing = new this.PreviewDrawingClass(
      points,
      this._defaultOptions,
      { ...this._options },
    );
    ensureDefined(this._series).attachPrimitive(this._previewDrawing);
  }

  private _removePreviewDrawing() {
    if (this._previewDrawing) {
      ensureDefined(this._series).detachPrimitive(this._previewDrawing);
      this._previewDrawing = undefined;
    }
  }
}
