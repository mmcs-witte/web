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
import { Point as Point2D } from '@flatten-js/core';
import { DrawingBase, DrawingToolBase, RectangleAxisPaneRenderer, type Point, type ViewPoint } from './drawing-base.ts';
import { calculateDrawingPoint, convertToPrice, convertViewPointToPoint2D } from './conversion-helper.ts';

export interface LineInfo {
	level: number;
	lineColor: string;
	lineWidth: number;
}

export interface GannBoxDrawInfo {
	pointStart: Point2D;
	pointEnd: Point2D;
	priceLevels: LineInfo[];
	timeLevels: LineInfo[];

	drawTopLabels: boolean;
	drawBottomLabels: boolean;
	drawLeftLabels: boolean;
	drawRightLabels: boolean;

	drawAngles: boolean;
	isReversed: boolean;

	fill: boolean;
	fillOpacity: number;
}

// export function DrawGannBox(drawInfo: GannBoxDrawInfo)
// {
// 	// filling background
// 	const fillLineBackground = [](const GannBoxDrawInfo& drawInfo, const bool bIsVertical)
// 		{
// 			// Gdiplus::Graphics& graphics, const GannBoxDrawInfo& drawInfo, const bool bIsVertical
// 			const auto& levels = bIsVertical ? drawInfo.priceLevels : drawInfo.timeLevels;

// 			for (size_t i = 1; i < levels.size(); ++i)
// 			{
// 				Gdiplus::Color color(60, GetRValue(levels[i].argb), GetGValue(levels[i].argb), GetBValue(levels[i].argb));
// 				Gdiplus::SolidBrush brush(color);

// 				double prevLevel = levels[i - 1].level;
// 				double currLevel = levels[i].level;

// 				auto dirMajor = bIsVertical ?
// 					CFPoint(0.0, drawInfo.pointEnd.y) - CFPoint(0.0, drawInfo.pointStart.y) :
// 					CFPoint(drawInfo.pointEnd.x, 0.0) - CFPoint(drawInfo.pointStart.x, 0.0);

// 				auto dirMinor = bIsVertical ?
// 					CFPoint(drawInfo.pointEnd.x, 0.0) - CFPoint(drawInfo.pointStart.x, 0.0) :
// 					CFPoint(0.0, drawInfo.pointEnd.y) - CFPoint(0.0, drawInfo.pointStart.y);

// 				CFPoint currLineStart = drawInfo.pointStart + dirMajor * currLevel;
// 				CFPoint currLineEnd = currLineStart + dirMinor;

// 				CFPoint prevLineStart = drawInfo.pointStart + dirMajor * prevLevel;
// 				CFPoint prevLineEnd = prevLineStart + dirMinor;

// 				std::vector<Gdiplus::PointF> fillPoints
// 				{
// 					MathHelper::TransformPointFromDoubleToFloat(currLineStart),
// 					MathHelper::TransformPointFromDoubleToFloat(currLineEnd),
// 					MathHelper::TransformPointFromDoubleToFloat(prevLineEnd),
// 					MathHelper::TransformPointFromDoubleToFloat(prevLineStart)
// 				};

// 				graphics.FillPolygon(&brush, fillPoints.data(), fillPoints.size());
// 			}
// 		};

// 	fillLineBackground(graphics, drawInfo, true);
// 	fillLineBackground(graphics, drawInfo, false);

// 	bool bIsVertical = true;
// 	Gdiplus::Color color(0);
// 	Gdiplus::SolidBrush brush(color);
// 	Gdiplus::Pen pen(color);

// 	auto drawLines = [this, &graphics, &drawInfo, &bIsVertical](const LineInfo& lineInfo)
// 		{
// 			//Gdiplus::Color color(lineInfo.argb);
// 			Gdiplus::Color color(GetRValue(lineInfo.argb), GetGValue(lineInfo.argb), GetBValue(lineInfo.argb));
// 			Gdiplus::Pen pen(color);
// 			pen.SetWidth(lineInfo.penWidth);

// 			auto dirMajor = bIsVertical ?
// 				CFPoint(0.0, drawInfo.pointEnd.y) - CFPoint(0.0, drawInfo.pointStart.y) :
// 				CFPoint(drawInfo.pointEnd.x, 0.0) - CFPoint(drawInfo.pointStart.x, 0.0);

// 			auto dirMinor = bIsVertical ?
// 				CFPoint(drawInfo.pointEnd.x, 0.0) - CFPoint(drawInfo.pointStart.x, 0.0) :
// 				CFPoint(0.0, drawInfo.pointEnd.y) - CFPoint(0.0, drawInfo.pointStart.y);

// 			CFPoint lineStart = drawInfo.pointStart + dirMajor * lineInfo.level;
// 			CFPoint lineEnd = lineStart + dirMinor;

// 			graphics.DrawLine(&pen,
// 				Gdiplus::PointF(static_cast<float>(lineStart.x), static_cast<float>(lineStart.y)),
// 				Gdiplus::PointF(static_cast<float>(lineEnd.x), static_cast<float>(lineEnd.y)));


// 			const int textOffset = SCALE_X(2);
// 			if (bIsVertical)
// 			{
// 				if (drawInfo.drawLeftLabels)
// 				{
// 					CFPoint mostLeftPoint = lineStart.x < lineEnd.x ? lineStart : lineEnd;
// 					CFPoint labelPosition;

// 					CString percentLabel;
// 					percentLabel += FloatToLocalStr<CString>(lineInfo.level, 3);

// 					RECT textBoundingBox;
// 					Gdiplus::StringFormat format;
// 					format.SetAlignment(Gdiplus::StringAlignmentNear);
// 					format.SetLineAlignment(Gdiplus::StringAlignmentNear);
// 					GetStringBoundingBox(percentLabel, drawInfo.labelFont, textBoundingBox, &format);

// 					int nTextWidth = abs(textBoundingBox.right - textBoundingBox.left);
// 					int nTextHeight = abs(textBoundingBox.bottom - textBoundingBox.top);

// 					CPoint textTopLeft = { static_cast<int>(mostLeftPoint.x - nTextWidth - textOffset), static_cast<int>(mostLeftPoint.y - nTextHeight / 2) };
// 					auto textRect = CRect{ textTopLeft.x, textTopLeft.y, textTopLeft.x + nTextWidth, textTopLeft.y + nTextHeight };

// 					DrawStringClip(textRect.left, textRect.top, percentLabel, drawInfo.labelFont, lineInfo.argb, color.GetAlpha(), TA_TOP | TA_LEFT);
// 				}
// 				if (drawInfo.drawRightLabels) 
// 				{
// 					CFPoint mostRightPoint = lineStart.x > lineEnd.x ? lineStart : lineEnd;
// 					CFPoint labelPosition;

// 					CString percentLabel;
// 					percentLabel += FloatToLocalStr<CString>(lineInfo.level, 3);

// 					RECT textBoundingBox;
// 					Gdiplus::StringFormat format;
// 					format.SetAlignment(Gdiplus::StringAlignmentNear);
// 					format.SetLineAlignment(Gdiplus::StringAlignmentNear);
// 					GetStringBoundingBox(percentLabel, drawInfo.labelFont, textBoundingBox, &format);

// 					int nTextWidth = abs(textBoundingBox.right - textBoundingBox.left);
// 					int nTextHeight = abs(textBoundingBox.bottom - textBoundingBox.top);

// 					CPoint textTopLeft = { static_cast<int>(mostRightPoint.x + textOffset) , static_cast<int>(mostRightPoint.y - nTextHeight / 2) };
// 					auto textRect = CRect{ textTopLeft.x, textTopLeft.y, textTopLeft.x + nTextWidth, textTopLeft.y + nTextHeight };

// 					DrawStringClip(textRect.left, textRect.top, percentLabel, drawInfo.labelFont, lineInfo.argb, color.GetAlpha(), TA_TOP | TA_LEFT);
// 				}
// 			}
// 			else 
// 			{
// 				if (drawInfo.drawTopLabels) 
// 				{
// 					CFPoint mostTopPoint = lineStart.y < lineEnd.y ? lineStart : lineEnd;
// 					CFPoint labelPosition;

// 					CString percentLabel;
// 					percentLabel += FloatToLocalStr<CString>(lineInfo.level, 3);

// 					RECT textBoundingBox;
// 					Gdiplus::StringFormat format;
// 					format.SetAlignment(Gdiplus::StringAlignmentNear);
// 					format.SetLineAlignment(Gdiplus::StringAlignmentNear);
// 					GetStringBoundingBox(percentLabel, drawInfo.labelFont, textBoundingBox, &format);

// 					int nTextWidth = abs(textBoundingBox.right - textBoundingBox.left);
// 					int nTextHeight = abs(textBoundingBox.bottom - textBoundingBox.top);

// 					CPoint textTopLeft = { static_cast<int>(mostTopPoint.x - nTextWidth / 2) , static_cast<int>(mostTopPoint.y - textOffset - nTextHeight) };
// 					auto textRect = CRect{ textTopLeft.x, textTopLeft.y, textTopLeft.x + nTextWidth, textTopLeft.y + nTextHeight };

// 					DrawStringClip(textRect.left, textRect.top, percentLabel, drawInfo.labelFont, lineInfo.argb, color.GetAlpha(), TA_TOP | TA_LEFT);
// 				}

// 				if (drawInfo.drawBottomLabels) 
// 				{
// 					CFPoint mostBottomPoint = lineStart.y > lineEnd.y ? lineStart : lineEnd;
// 					CFPoint labelPosition;

// 					CString percentLabel;
// 					percentLabel += FloatToLocalStr<CString>(lineInfo.level, 3);

// 					RECT textBoundingBox;
// 					Gdiplus::StringFormat format;
// 					format.SetAlignment(Gdiplus::StringAlignmentNear);
// 					format.SetLineAlignment(Gdiplus::StringAlignmentNear);
// 					GetStringBoundingBox(percentLabel, drawInfo.labelFont, textBoundingBox, &format);

// 					int nTextWidth = abs(textBoundingBox.right - textBoundingBox.left);
// 					int nTextHeight = abs(textBoundingBox.bottom - textBoundingBox.top);

// 					CPoint textTopLeft = { static_cast<int>(mostBottomPoint.x - nTextWidth / 2) , static_cast<int>(mostBottomPoint.y + textOffset) };
// 					auto textRect = CRect{ textTopLeft.x, textTopLeft.y, textTopLeft.x + nTextWidth, textTopLeft.y + nTextHeight };

// 					DrawStringClip(textRect.left, textRect.top, percentLabel, drawInfo.labelFont, lineInfo.argb, color.GetAlpha(), TA_TOP | TA_LEFT);
// 				}
// 			}
// 			// TODO: draw labels to left and right
// 		};


// 	// drawing price lines
// 	bIsVertical = true;
// 	std::for_each(drawInfo.priceLevels.begin(), drawInfo.priceLevels.end(), drawLines);
// 	// drawing time lines
// 	bIsVertical = false;
// 	std::for_each(drawInfo.timeLevels.begin(), drawInfo.timeLevels.end(), drawLines);
// }

class GannBoxPaneRenderer implements IPrimitivePaneRenderer {
	_points: ViewPoint[];
	_fillColor: string;

	constructor(points: ViewPoint[], fillColor: string) {
		this._points = new Array<ViewPoint>(points.length);
		for (let i = 0; i < points.length; i++) {
			this._points[i] = points[i];
		}
		this._fillColor = fillColor;
	}

	draw(target: CanvasRenderingTarget2D) {
		target.useBitmapCoordinateSpace(scope => {
			if (this._points.length < 2) {
				return;
			}

			const ctx = scope.context;

			for (let i = 0; i < this._points.length; i++) {
				this._points[i] = calculateDrawingPoint(this._points[i], scope);
			}

      const drawingPoints: Point2D[] = [];
      this._points.forEach((it) => {
        drawingPoints.push(convertViewPointToPoint2D(it));
      });

			if (this._points.length < 3) {
				ctx.beginPath();
				ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
				ctx.lineTo(drawingPoints[1].x, drawingPoints[1].y);
				ctx.strokeStyle = this._fillColor;
				ctx.lineWidth = scope.verticalPixelRatio;
				ctx.stroke();
			}
		});
	}

	hitTest(_x: number, _y: number): PrimitiveHoveredItem | null {
		return null;
		
		// if (this._points.length < 3) {
		// 	return null;
		// }
		// const vertex1: Vector2D = convertViewPointToPoint2D(this._points[0]);
		// const vertex2: Vector2D = convertViewPointToPoint2D(this._points[1]);
		// const coVertex: Vector2D = convertViewPointToPoint2D(this._points[2]);

		// const dir: Vector2D = vertex1.subtract(vertex2);
		// const controlPoint1: Vector2D = coVertex.add(dir.scale(0.25, 0.25));
		// const controlPoint2: Vector2D = coVertex.subtract(dir.scale(0.25, 0.25));

		// const epsilon: number = 3e-0;

		// const currPoint = new Point2D(x, y);
		// const hitFirstHalf = CollisionHelper.HitTestQuadraticBezierCurve(new Point2D(vertex1.x, vertex1.y), new Point2D(coVertex.x, coVertex.y), new Point2D(controlPoint1.x, controlPoint1.y), currPoint, epsilon);
		// const hitSecondHalf = CollisionHelper.HitTestQuadraticBezierCurve(new Point2D(coVertex.x, coVertex.y), new Point2D(vertex2.x, vertex2.y), new Point2D(controlPoint2.x, controlPoint2.y), currPoint, epsilon);

		// if (!hitFirstHalf && !hitSecondHalf) {
		// 	return null;
		// }

		// return {
		// 	cursorStyle: "grab",
		// 	externalId: 'gann-box-drawing',
		// 	zOrder: 'top',
		// };
	}
}

class GannBoxPaneView implements IPrimitivePaneView {
	_source: GannBox;
	_points: Point[];
	_drawingPoints: ViewPoint[];

	constructor(source: GannBox) {
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
		return new GannBoxPaneRenderer(
			this._drawingPoints,
			this._source._options.fillColor
		);
	}
}

abstract class GannBoxAxisPaneView implements IPrimitivePaneView {
	_source: GannBox;
	_minPoint: number | null = null;
	_maxPoint: number | null = null;
	_vertical: boolean = false;

	constructor(source: GannBox, vertical: boolean) {
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

class GannBoxPriceAxisPaneView extends GannBoxAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const series = this._source.series;
		const y1 = series.priceToCoordinate(convertToPrice(this._source._bounds._minPrice));
		const y2 = series.priceToCoordinate(convertToPrice(this._source._bounds._maxPrice));
		return [y1, y2];
	}
}

class GannBoxTimeAxisPaneView extends GannBoxAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const timeScale = this._source.chart.timeScale();
		const x1 = timeScale.timeToCoordinate(this._source._bounds._minTime as Time);
		const x2 = timeScale.timeToCoordinate(this._source._bounds._maxTime as Time);
		return [x1, x2];
	}
}

abstract class CurveAxisView implements ISeriesPrimitiveAxisView {
	_source: GannBox;
	_p: Point;
	_pos: Coordinate | null = null;
	constructor(source: GannBox, p: Point) {
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

class GannBoxTimeAxisView extends CurveAxisView {
	update() {
		const timeScale = this._source.chart.timeScale();
		this._pos = timeScale.timeToCoordinate(this._p.time);
	}
	text() {
		return this._source._options.timeLabelFormatter(this._p.time);
	}
}

class GannBoxPriceAxisView extends CurveAxisView {
	update() {
		const series = this._source.series;
		this._pos = series.priceToCoordinate(this._p.price);
	}
	text() {
		return this._source._options.priceLabelFormatter(this._p.price);
	}
}

export interface GannBoxOptions {
	fillColor: string;
	previewFillColor: string;
	labelColor: string;
	labelTextColor: string;
	showLabels: boolean;
	priceLabelFormatter: (price: number) => string;
	timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: GannBoxOptions = {
	fillColor: 'rgba(19, 148, 234, 0.59)',
	previewFillColor: 'rgba(19, 148, 234, 0.36)',
	labelColor: 'rgba(19, 148, 234, 0.59)',
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

class GannBox extends DrawingBase<GannBoxOptions> {
	_paneViews: GannBoxPaneView[];
	_timeAxisViews: GannBoxTimeAxisView[] = [];
	_priceAxisViews: GannBoxPriceAxisView[] = [];
	_priceAxisPaneViews: GannBoxPriceAxisPaneView[];
	_timeAxisPaneViews: GannBoxTimeAxisPaneView[];

	constructor(
		points: Point[],
		options: Partial<GannBoxOptions> = {}
	) {
		super(points, defaultOptions, options);
		
		this._paneViews = [new GannBoxPaneView(this)];
		points.forEach(point => {
			this._timeAxisViews.push(new GannBoxTimeAxisView(this, point));
			this._priceAxisViews.push(new GannBoxPriceAxisView(this, point));
		});
		this._priceAxisPaneViews = [new GannBoxPriceAxisPaneView(this, true)];
		this._timeAxisPaneViews = [new GannBoxTimeAxisPaneView(this, false)];
	}

	public override addPoint(p: Point) {
		this._updateDrawingBounds(p);
		this._points.push(p);
		this._timeAxisViews.push(new GannBoxTimeAxisView(this, p));
		this._priceAxisViews.push(new GannBoxPriceAxisView(this, p));
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

	applyOptions(options: Partial<GannBoxOptions>) {
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

class GannBoxPreview extends GannBox {
	constructor(
		points: Point[],
		options: Partial<GannBoxOptions> = {}
	) {
		super(points, options);
		this._options.fillColor = this._options.previewFillColor;
	}
}

export class GannBoxDrawingTool extends DrawingToolBase<
	DrawingBase<GannBoxOptions>,
	DrawingBase<GannBoxOptions>,
	GannBoxOptions> {
	_numberPoints: number = 2;

	constructor(
		chart: IChartApi,
		series: ISeriesApi<SeriesType>,
		options: Partial<GannBoxOptions>
	) {
		super(GannBox, GannBoxPreview, chart, series, defaultOptions, options);
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
			if (this._pointsCache.length > this._numberPoints) {
				this._removePreviewDrawing();
				this._addNewDrawing(this._pointsCache.slice(0, this._numberPoints));
				this.stopDrawing();
			}
		}
	}
}
