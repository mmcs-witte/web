import { Point as Point2D, Vector as Vector2D } from "@flatten-js/core";
import { Box } from "@flatten-js/core";
import { MathHelper } from "./math-helper";

export abstract class CollisionHelper {
    public static HitTestLineToLine(lineStart1: Point2D, lineEnd1: Point2D, lineStart2: Point2D, lineEnd2: Point2D): [boolean, Point2D] {
        // https://www.jeffreythompson.org/collision-detection/

        const x1: number = lineStart1.x;
        const x2: number = lineEnd1.x;
        const x3: number = lineStart2.x;
        const x4: number = lineEnd2.x;
        const y1: number = lineStart1.y;
        const y2: number = lineEnd1.y;
        const y3: number = lineStart2.y;
        const y4: number = lineEnd2.y;

        // calculate the direction of the lines
        const uA: number = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
        const uB: number = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

        // if uA and uB are between 0-1, lines are colliding
        if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {

            const intersectionX: number = x1 + (uA * (x2 - x1));
            const intersectionY: number = y1 + (uA * (y2 - y1));

            const collisionPoint: Point2D = new Point2D(intersectionX, intersectionY);
            return [true, collisionPoint];
        }
        return [false, new Point2D(-1, -1)];
    }

    public static HitTestLineToRect(lineStart1: Point2D, lineEnd1: Point2D, rect: Box): [boolean, Point2D[]] {
        // check if the line has hit any of the rectangle's sides
        // uses the Line/Line function below
        const collisionPoints: Point2D[] = [];

        let collisionPoint: Point2D;
        const rectPoints: Point2D[] = [new Point2D(rect.xmin, rect.ymin), new Point2D(rect.xmin, rect.ymax), new Point2D(rect.xmax, rect.ymax), new Point2D(rect.xmax, rect.ymin)];

        let bHit: boolean = false;
        for (let i = 0; i < 4; ++i) {
            const lineStart2 = rectPoints[i % 4];
            const lineEnd2 = rectPoints[(i + 1) % 4];

            [bHit, collisionPoint] = this.HitTestLineToLine(lineStart1, lineEnd1, lineStart2, lineEnd2);
            if (bHit) {
                bHit = true;
                collisionPoints.push(collisionPoint.clone());
            }
        }

        return [bHit, collisionPoints];
    }

    public static HitTestQuadraticBezierCurve(p1: Point2D, p2: Point2D, controlPoint: Point2D, point: Point2D, tolerance: number): boolean {
        const maxHitTestSegments = 100;

        const len: number = controlPoint.distanceTo(p1)[0] + controlPoint.distanceTo(p2)[0];
        const step = Math.max(3 / len, 1 / maxHitTestSegments);
        for (let t = 0; t <= 1; t += step) {
            if (t > 1) {
                t = 1;
            }
            // (1-t)^2 * P0 + 2t * (1-t) * P1 + t * t *P2
            // P0 = p1
            // P1 = p3
            // P2 = p2
            const s1 = p1.scale((1 - t) * (1 - t), (1 - t) * (1 - t));
            const s2 = controlPoint.scale(2 * t * (1 - t), 2 * t * (1 - t));
            const s3 = p2.scale(t * t, t * t);
            const currPointOnCurve = new Point2D(s1.x + s2.x + s3.x, s1.y + s2.y + s3.y);
            if (currPointOnCurve.distanceTo(point)[0] < tolerance)
                return true;

            if (t == 1)
                break;
        }
        return false;
    }

    public static IsPointInRectangle(point: Point2D, rect: Box): boolean {
        return point.x <= rect.xmax && point.x >= rect.xmin && point.y >= rect.ymin && point.y <= rect.ymax;
    }

    public static IsPointInEllipse(point: Point2D, ellipseOrigin: Point2D, semiMajorAxis: number, semiMinorAxis: number): boolean {
        if (MathHelper.AreEqual(semiMinorAxis, 0.0) || MathHelper.AreEqual(semiMajorAxis, 0.0))
            return false;

        return (((point.x - ellipseOrigin.x) * (point.x - ellipseOrigin.x)) / (semiMajorAxis * semiMajorAxis) +
            ((point.y - ellipseOrigin.y) * (point.y - ellipseOrigin.y)) / (semiMinorAxis * semiMinorAxis)) <= 1.0;
    }

    public static IsPointInPolygon(point: Point2D, polygonPoints: Point2D[]): boolean {
        const x: number = point.x;
        const y: number = point.y;

        let i: number;
        let j: number = polygonPoints.length - 1;
        let oddNodes: boolean = false;

        for (i = 0; i < polygonPoints.length; i++) {
            if ((polygonPoints[i].y < y && polygonPoints[j].y >= y
                || polygonPoints[j].y < y && polygonPoints[i].y >= y)
                && (polygonPoints[i].x <= x || polygonPoints[j].x <= x)) {
                const tmp: boolean = polygonPoints[i].x + (y - polygonPoints[i].y) / (polygonPoints[j].y - polygonPoints[i].y) * (polygonPoints[j].x - polygonPoints[i].x) < x;
                oddNodes = oddNodes !== tmp;
            }
            j = i;
        }

        return oddNodes;
    }

    public static IsLineInRectangle(lineStart1: Point2D, lineEnd1: Point2D, rect: Box): boolean {
        return this.IsPointInRectangle(lineStart1, rect) && this.IsPointInRectangle(lineEnd1, rect);
    }

    public static IsPointInAreaEnclosedByCurve(point: Point2D, vertex1: Point2D, vertex2: Point2D, coVertex: Point2D): boolean {
        const dir: Vector2D = new Vector2D(vertex1.x, vertex1.y).subtract(new Vector2D(vertex2.x, vertex2.y));
        const controlPoint1 = new Vector2D(coVertex.x, coVertex.y).add(dir.scale(0.25, 0.25));
        const controlPoint2 = new Vector2D(coVertex.x, coVertex.y).subtract(dir.scale(0.25, 0.25));

        const firstHalfPoints: Point2D[] = MathHelper.ApproximateQuadraticBezierCurveWithPolyline(vertex1, coVertex, new Point2D(controlPoint1.x, controlPoint1.y));
        const secondHalfPoints: Point2D[] = MathHelper.ApproximateQuadraticBezierCurveWithPolyline(coVertex, vertex2, new Point2D(controlPoint2.x, controlPoint2.y));

        const polygonPoints: Point2D[] = firstHalfPoints.concat(secondHalfPoints);

        return this.IsPointInPolygon(point, polygonPoints);
    }

    /// @details Calculates the distance to the arc if the currPoint can hit the arc with a center point of arcCenter and with a
    ///	start angle of arcStartAngle (in degrees, counterclockwise) and a sweep angle (in degrees, counterclockwise),
    /// otherwise returns DBL_MAX
    ///
    /// @param currPoint	 Point used to calculate distance from
    /// @param arcCenter	 Center of the arc
    ///	@param arcRadius	 Radius of the arc
    ///	@param arcStartAngle A start arc angle in degrees, counterclockwise
    ///	@param arcSweepAngle A sweep arc angle in degrees, counterclockwise
    ///	@returns The distance to the arc
    public static HitTestArc(currPoint: Point2D, arcCenter: Point2D, arcRadius: number, arcStartAngle: number, arcSweepAngle: number, tolerance: number): boolean {
        let arcStartAngleDir: Vector2D = new Vector2D(1.0, 0.0);
        arcStartAngleDir = MathHelper.RotateVector(arcStartAngleDir, MathHelper.ToRadians(arcStartAngle));

        let currVecDir: Vector2D = new Vector2D(currPoint.x, currPoint.y).subtract(new Vector2D(arcCenter.x, arcCenter.y));
        currVecDir = currVecDir.normalize();

        const angleDeviationFromStartAngle: number = MathHelper.ToDegrees(MathHelper.AngleBetweenVectors(arcStartAngleDir, currVecDir));

        let bHits: boolean = false;
        if (arcSweepAngle < 0.0 && angleDeviationFromStartAngle < 0.0) {
            bHits = angleDeviationFromStartAngle > arcSweepAngle;
        }
        else if (arcSweepAngle >= 0 && angleDeviationFromStartAngle >= 0.0) {
            bHits = angleDeviationFromStartAngle < arcSweepAngle;
        }
        return bHits ? this.HitTestFullCircleArc(currPoint, arcCenter, arcRadius, tolerance) : false;
    }

    public static HitTestFullCircleArc(point: Point2D, arcCenter: Point2D, radius: number, tolerance: number): boolean {
        return Math.abs(radius - point.distanceTo(arcCenter)[0]) < tolerance ? true : false;
    }
}

