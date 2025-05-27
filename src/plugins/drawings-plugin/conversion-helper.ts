import type { BitmapCoordinatesRenderingScope } from "fancy-canvas";
import type { ViewPoint } from "./drawing-base";
import { Point as Point2D, Vector as Vector2D } from "@flatten-js/core";
import type { Coordinate } from "lightweight-charts";

export function convertToPrice(x: number | null) : number {
  return x as number;
}

export function convertViewPointToPoint2D(point: ViewPoint) : Point2D {
  return new Point2D(point.x as number, point.y as number);
}

export function convertViewPointToVector2D(point: ViewPoint) : Vector2D {
  return new Vector2D(point.x as number, point.y as number);
}

export function calculateDrawingPoint(point: ViewPoint, scope: BitmapCoordinatesRenderingScope): ViewPoint {
	return {
		x: Math.round((point.x?? 0) * scope.horizontalPixelRatio) as Coordinate,
		y: Math.round((point.y?? 0) * scope.verticalPixelRatio) as Coordinate,
	};
};
