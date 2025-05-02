import type { CanvasRenderingTarget2D } from 'fancy-canvas';
import type {
	Coordinate,
	IChartApi,
	ISeriesApi,
	ISeriesPrimitiveAxisView,
	IPrimitivePaneRenderer,
	IPrimitivePaneView,
	MouseEventParams,
	SeriesType,
	Time,
} from 'lightweight-charts';

import { ensureDefined } from '../../helpers/assertions.ts';
import { PluginBase } from '../plugin-base.ts';
import { positionsLine } from '../../helpers/dimensions/positions.ts';

class TimeLinePaneRenderer implements IPrimitivePaneRenderer {
	_x: Coordinate | null = null;
	_options: TimeLineOptions;
	constructor(x: Coordinate | null, options: TimeLineOptions) {
		this._x = x;
		this._options = options;
	}
	draw(target: CanvasRenderingTarget2D) {
		target.useBitmapCoordinateSpace(scope => {
			if (this._x === null) return;
			const ctx = scope.context;
			const position = positionsLine(
				this._x,
				scope.horizontalPixelRatio,
				this._options.width
			);
			ctx.fillStyle = this._options.color;
			ctx.fillRect(
				position.position,
				0,
				position.length,
				scope.bitmapSize.height
			);
		});
	}
}

class TimeLinePaneView implements IPrimitivePaneView {
	_source: TimeLine;
	_x: Coordinate | null = null;
	_options: TimeLineOptions;

	constructor(source: TimeLine, options: TimeLineOptions) {
		this._source = source;
		this._options = options;
	}
	update() {
		const timeScale = this._source._chart.timeScale();
		this._x = timeScale.timeToCoordinate(this._source._p1.time);
	}
	renderer() {
		return new TimeLinePaneRenderer(this._x, this._options);
	}
}

class TimeLineTimeAxisView implements ISeriesPrimitiveAxisView {
	_source: TimeLine;
	_x: Coordinate | null = null;
	_options: TimeLineOptions;

	constructor(source: TimeLine, options: TimeLineOptions) {
		this._source = source;
		this._options = options;
	}
	update() {
		const timeScale = this._source._chart.timeScale();
		this._x = timeScale.timeToCoordinate(this._source._p1.time);
	}
	visible() {
		return this._options.showLabel;
	}
	tickVisible() {
		return this._options.showLabel;
	}
	coordinate() {
		return this._x ?? 0;
	}
	text() {
		return this._options.labelText;
	}
	textColor() {
		return this._options.labelTextColor;
	}
	backColor() {
		return this._options.labelBackgroundColor;
	}
}
interface Point {
  time: Time;
  price: number;
}

export interface TimeLineOptions {
	color: string;
	labelText: string;
	width: number;
	labelBackgroundColor: string;
	labelTextColor: string;
	showLabel: boolean;
}

const defaultOptions: TimeLineOptions = {
	color: 'green',
	labelText: '',
	width: 3,
	labelBackgroundColor: 'green',
	labelTextColor: 'white',
	showLabel: false,
};
class TimeLine extends PluginBase {
  _p1: Point;
  _paneViews: TimeLinePaneView[];
  _timeAxisViews: TimeLineTimeAxisView[];
  _options: TimeLineOptions;

  constructor(
    p1: Point,
    options: Partial<TimeLineOptions> = {}
  ) {
    super();
    this._p1 = p1;
    this._options = {
      ...defaultOptions,
      ...options,
    };

    this._paneViews = [new TimeLinePaneView(this, this._options)];
    this._timeAxisViews = [new TimeLineTimeAxisView(this, this._options)];
  }

  updateAllViews() {
    this._paneViews.forEach(pw => pw.update());
    this._timeAxisViews.forEach(pw => pw.update());
  }

  timeAxisViews() {
    return this._timeAxisViews;
  }

  paneViews() {
    return this._paneViews;
  }

  applyOptions(options: Partial<TimeLineOptions>) {
    this._options = { ...this._options, ...options };
    this.requestUpdate();
  }
}

export class TimeLineDrawingTool {
  private _chart: IChartApi | undefined;
  private _series: ISeriesApi<SeriesType> | undefined;
  private _defaultOptions: Partial<TimeLineOptions>;
  private _drawings: TimeLine[];
  private _points: Point[] = [];
  private _drawing: boolean = false;

  constructor(
    chart: IChartApi,
    series: ISeriesApi<SeriesType>,
    options: Partial<TimeLineOptions>
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
      this._removeDrawing(rectangle);
    });
    this._drawings = [];
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
    return;
  }

  private _addPoint(p: Point) {
    this._points.push(p);
    if (this._points.length >= 1) {
      this._addNewDrawing(this._points[0]);
      this.stopDrawing();
    }
  }

  private _addNewDrawing(p1: Point) {
    const drawing = new TimeLine(p1, { ...this._defaultOptions });
    this._drawings.push(drawing);
    ensureDefined(this._series).attachPrimitive(drawing);
  }

  private _removeDrawing(drawing: TimeLine) {
    ensureDefined(this._series).detachPrimitive(drawing);
  }
}
