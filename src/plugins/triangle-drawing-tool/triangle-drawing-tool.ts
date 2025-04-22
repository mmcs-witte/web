import { CanvasRenderingTarget2D } from 'fancy-canvas';
import {
	Coordinate,
	IChartApi,
	isBusinessDay,
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

class TrianglePaneRenderer implements IPrimitivePaneRenderer {
	_p1: ViewPoint;
	_p2: ViewPoint;
	_p3: ViewPoint;
	_fillColor: string;

	constructor(p1: ViewPoint, p2: ViewPoint, p3: ViewPoint, fillColor: string) {
		this._p1 = p1;
		this._p2 = p2;
		this._p3 = p3;
		this._fillColor = fillColor;
	}

	draw(target: CanvasRenderingTarget2D) {
		debugger;
		target.useBitmapCoordinateSpace(scope => {
			if (
				this._p1.x === null ||
				this._p1.y === null ||
				this._p2.x === null ||
				this._p2.y === null
			)
			{
				return;
			}
			const ctx = scope.context;
			const horizontalPositions = positionsBox(
				this._p1.x,
				this._p2.x,
				scope.horizontalPixelRatio
			);
			const verticalPositions = positionsBox(
				this._p1.y,
				this._p2.y,
				scope.verticalPixelRatio
			);
			ctx.fillStyle = this._fillColor;

			if (this._p3.x === null ||
				this._p3.y === null)
			{
				ctx.fillText("Triangle", horizontalPositions.position, verticalPositions.position);
				ctx.fillRect(
					horizontalPositions.position,
					verticalPositions.position,
					horizontalPositions.length,
					verticalPositions.length
				);
			}
			else {
				ctx.beginPath();
				ctx.moveTo(this._p1.x, this._p1.y);
				ctx.lineTo(this._p2.x, this._p2.y);
				ctx.lineTo(this._p3.x, this._p3.y);
				ctx.fill();
			}
		});
	}
}

interface ViewPoint {
	x: Coordinate | null;
	y: Coordinate | null;
}

class TrianglePaneView implements IPrimitivePaneView {
	_source: Triangle;
	_p1: ViewPoint = { x: null, y: null };
	_p2: ViewPoint = { x: null, y: null };
	_p3: ViewPoint = { x: null, y: null };

	constructor(source: Triangle) {
		this._source = source;
	}

	update() {
		const series = this._source.series;
		const y1 = series.priceToCoordinate(this._source._p1.price);
		const y2 = series.priceToCoordinate(this._source._p2.price);
		const y3 = series.priceToCoordinate(this._source._p3.price);
		const timeScale = this._source.chart.timeScale();
		const x1 = timeScale.timeToCoordinate(this._source._p1.time);
		const x2 = timeScale.timeToCoordinate(this._source._p2.time);
		const x3 = timeScale.timeToCoordinate(this._source._p3.time);

		this._p1 = { x: x1, y: y1 };
		this._p2 = { x: x2, y: y2 };
		this._p3 = { x: x3, y: y3 };
	}

	renderer() {
		return new TrianglePaneRenderer(
			this._p1,
			this._p2,
			this._p3,
			this._source._options.fillColor
		);
	}
}

class TriangleAxisPaneRenderer implements IPrimitivePaneRenderer {
	_p1: number | null;
	_p2: number | null;
	_p3: number | null;
	_fillColor: string;
	_vertical: boolean = false;

	constructor(
		p1: number | null,
		p2: number | null,
		p3: number | null,
		fillColor: string,
		vertical: boolean
	) {
		this._p1 = p1;
		this._p2 = p2;
		this._p3 = p3;
		this._fillColor = fillColor;
		this._vertical = vertical;
	}

	draw(target: CanvasRenderingTarget2D) {
		target.useBitmapCoordinateSpace(scope => {
			if (this._p1 === null || this._p2 === null || this._p3 === null) return;
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

abstract class TriangleAxisPaneView implements IPrimitivePaneView {
	_source: Triangle;
	_p1: number | null = null;
	_p2: number | null = null;
	_p3: number | null = null;
	_vertical: boolean = false;

	constructor(source: Triangle, vertical: boolean) {
		this._source = source;
		this._vertical = vertical;
	}

	abstract getPoints(): [Coordinate | null, Coordinate | null, Coordinate | null];

	update() {
		[this._p1, this._p2, this._p3] = this.getPoints();
	}

	renderer() {
		return new TriangleAxisPaneRenderer(
			this._p1,
			this._p2,
			this._p3,
			this._source._options.fillColor,
			this._vertical
		);
	}
	zOrder(): PrimitivePaneViewZOrder {
		return 'bottom';
	}
}

class TrianglePriceAxisPaneView extends TriangleAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null, Coordinate | null] {
		const series = this._source.series;
		const y1 = series.priceToCoordinate(this._source._p1.price);
		const y2 = series.priceToCoordinate(this._source._p2.price);
		const y3 = series.priceToCoordinate(this._source._p3.price);
		return [y1, y2, y3];
	}
}

class TriangleTimeAxisPaneView extends TriangleAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null, Coordinate | null] {
		const timeScale = this._source.chart.timeScale();
		const x1 = timeScale.timeToCoordinate(this._source._p1.time);
		const x2 = timeScale.timeToCoordinate(this._source._p2.time);
		const x3 = timeScale.timeToCoordinate(this._source._p3.time);
		return [x1, x2, x3];
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

interface Point {
	time: Time;
	price: number;
}

export interface TriangleDrawingToolOptions {
	fillColor: string;
	previewFillColor: string;
	labelColor: string;
	labelTextColor: string;
	showLabels: boolean;
	priceLabelFormatter: (price: number) => string;
	timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: TriangleDrawingToolOptions = {
	fillColor: 'rgba(35, 220, 87, 0.75)',
	previewFillColor: 'rgba(57, 200, 50, 0.11)',
	labelColor: 'rgb(214, 106, 49)',
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

class Triangle extends PluginBase {
	_options: TriangleDrawingToolOptions;
	_p1: Point;
	_p2: Point;
	_p3: Point;
	_paneViews: TrianglePaneView[];
	_timeAxisViews: TriangleTimeAxisView[];
	_priceAxisViews: TrianglePriceAxisView[];
	_priceAxisPaneViews: TrianglePriceAxisPaneView[];
	_timeAxisPaneViews: TriangleTimeAxisPaneView[];

	constructor(
		p1: Point,
		p2: Point,
		p3: Point,
		options: Partial<TriangleDrawingToolOptions> = {}
	) {
		super();
		this._p1 = p1;
		this._p2 = p2;
		this._p3 = p3;
		this._options = {
			...defaultOptions,
			...options,
		};
		this._paneViews = [new TrianglePaneView(this)];
		this._timeAxisViews = [
			new TriangleTimeAxisView(this, p1),
			new TriangleTimeAxisView(this, p2),
			new TriangleTimeAxisView(this, p3),
		];
		this._priceAxisViews = [
			new TrianglePriceAxisView(this, p1),
			new TrianglePriceAxisView(this, p2),
			new TrianglePriceAxisView(this, p3),
		];
		this._priceAxisPaneViews = [new TrianglePriceAxisPaneView(this, true)];
		this._timeAxisPaneViews = [new TriangleTimeAxisPaneView(this, false)];
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

	applyOptions(options: Partial<TriangleDrawingToolOptions>) {
		this._options = { ...this._options, ...options };
		this.requestUpdate();
	}
}

class PreviewTriangle extends Triangle {
	constructor(
		p1: Point,
		p2: Point,
		p3: Point,
		options: Partial<TriangleDrawingToolOptions> = {}
	) {
		super(p1, p2, p3, options);
		this._options.fillColor = this._options.previewFillColor;
	}

	public updateEndPoint(p: Point, index : number) {
		switch (index) {
			case 1:
				this._p2 = p;
				break;
			case 2:
				this._p3 = p;
				break;
		}

		this._paneViews[0].update();
		this._timeAxisViews[index].movePoint(p);
		this._priceAxisViews[index].movePoint(p);

		this.requestUpdate();
	}
}

export class TriangleDrawingTool {
	private _chart: IChartApi | undefined;
	private _series: ISeriesApi<SeriesType> | undefined;
	private _drawingsToolbarContainer: HTMLDivElement | undefined;
	private _defaultOptions: Partial<TriangleDrawingToolOptions>;
	private _triangles: Triangle[];
	private _previewTriangle: PreviewTriangle | undefined = undefined;
	private _points: Point[] = [];
	private _drawing: boolean = false;
	private _toolbarButton: HTMLDivElement | undefined;

	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		drawingsToolbarContainer: HTMLDivElement,
		options: Partial<TriangleDrawingToolOptions>
	) {
		this._chart = chart;
		this._series = series;
		this._drawingsToolbarContainer = drawingsToolbarContainer;
		this._addToolbarButton();
		this._defaultOptions = options;
		this._triangles = [];
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
		this._triangles.forEach(triangle => {
			this._removeTriangle(triangle);
		});
		this._triangles = [];
		this._removePreviewTriangle();
		this._chart = undefined;
		this._series = undefined;
		this._drawingsToolbarContainer = undefined;
	}

	startDrawing(): void {
		this._drawing = true;
		this._points = [];
		if (this._toolbarButton) {
			this._toolbarButton.style.fill = 'rgb(100, 150, 250)';
		}
	}

	stopDrawing(): void {
		this._drawing = false;
		this._points = [];
		if (this._toolbarButton) {
			this._toolbarButton.style.fill = 'rgb(0, 0, 0)';
		}
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

		const numPoints: number = this._points.length;

		if (this._previewTriangle) {
			this._previewTriangle.updateEndPoint(
				{
					time: param.time,
					price,
				},
				numPoints);
		}
	}

	private _addPoint(p: Point) {
		this._points.push(p);
		if (this._points.length > 2) {
			this._addNewTriangle(this._points[0], this._points[1],  this._points[2]);
			this.stopDrawing();
			this._removePreviewTriangle();
		}
		if (this._points.length === 1) {
			this._addPreviewTriangle(this._points[0]);
		}
	}

	private _addNewTriangle(p1: Point, p2: Point, p3: Point) {
		const triangle = new Triangle(p1, p2, p3, { ...this._defaultOptions });
		this._triangles.push(triangle);
		ensureDefined(this._series).attachPrimitive(triangle);
	}

	private _removeTriangle(triangle: Triangle) {
		ensureDefined(this._series).detachPrimitive(triangle);
	}

	private _addPreviewTriangle(p: Point) {
		this._previewTriangle = new PreviewTriangle(p, p, p, {
			...this._defaultOptions,
		});
		ensureDefined(this._series).attachPrimitive(this._previewTriangle);
	}

	private _removePreviewTriangle() {
		if (this._previewTriangle) {
			ensureDefined(this._series).detachPrimitive(this._previewTriangle);
			this._previewTriangle = undefined;
		}
	}

	private _addToolbarButton() {
		if (!this._drawingsToolbarContainer) return;
		const button = document.createElement('div');
		button.style.width = '20px';
		button.style.height = '20px';
		button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M315.4 15.5C309.7 5.9 299.2 0 288 0s-21.7 5.9-27.4 15.5l-96 160c-5.9 9.9-6.1 22.2-.4 32.2s16.3 16.2 27.8 16.2H384c11.5 0 22.2-6.2 27.8-16.2s5.5-22.3-.4-32.2l-96-160zM288 312V456c0 22.1 17.9 40 40 40H472c22.1 0 40-17.9 40-40V312c0-22.1-17.9-40-40-40H328c-22.1 0-40 17.9-40 40zM128 512a128 128 0 1 0 0-256 128 128 0 1 0 0 256z"/></svg>`;
		button.addEventListener('click', () => {
			if (this.isDrawing()) {
				this.stopDrawing();
			} else {
				this.startDrawing();
			}
		});
		this._drawingsToolbarContainer.appendChild(button);
		this._toolbarButton = button;
		const colorPicker = document.createElement('input');
		colorPicker.type = 'color';
		colorPicker.value = '#C83264';
		colorPicker.style.width = '24px';
		colorPicker.style.height = '20px';
		colorPicker.style.border = 'none';
		colorPicker.style.padding = '0px';
		colorPicker.style.backgroundColor = 'transparent';
		colorPicker.addEventListener('change', () => {
			const newColor = colorPicker.value;
			this._defaultOptions.fillColor = newColor + 'CC';
			this._defaultOptions.previewFillColor = newColor + '77';
			this._defaultOptions.labelColor = newColor;
		});
		this._drawingsToolbarContainer.appendChild(colorPicker);
	}
}
