import { Point as Point2D, Vector as Vector2D } from "@flatten-js/core";

export interface BezierCurvesPointsInfo {
    endPoints: Point2D[];
    controlPoints1: Point2D[];
    controlPoints2: Point2D[];
};

export abstract class MathHelper {
    public static clamp(x: number, min: number, max: number): number {
        return Math.max(min, Math.min(x, max));
    }

    public static AreEqual(x: number, y: number, epsilon: number = 1e-5): boolean {
        return Math.abs(x - y) <= epsilon * Math.abs(x);
    }

    /// @details Counterclockwise angle from vector lhs to vector rhs
    public static AngleBetweenVectors(lhs: Vector2D, rhs: Vector2D): number {
        const dot = lhs.x * rhs.x + lhs.y * rhs.y;			// Dot product between[x1, y1] and [x2, y2]
        const det = lhs.x * rhs.y - lhs.y * rhs.x;			// Determinant
        return Math.atan2(det, dot);						        // atan2(y, x) or atan2(sin, cos)
    }

    public static RotateVector(vec: Vector2D, angle: number): Vector2D {
        const px = vec.x * Math.cos(angle) - vec.y * Math.sin(angle);
        const py = vec.x * Math.sin(angle) + vec.y * Math.cos(angle);
        vec.x = px;
        vec.y = py;
        return vec;
    }

    //  @details convert angle to [-PI, PI] range
    public static NormalizeAngle(angle: number): number {
        return Math.atan2(Math.sin(angle), Math.cos(angle));
    }

    public static ToRadians(angleDegrees: number): number {
        return angleDegrees / 180.0 * Math.PI;
    }

    public static ToDegrees(angleRadians: number): number {
        return angleRadians / Math.PI * 180.0;
    }

    // @details Fill cubic Bezier curve points for a curve connecting point1, point2, point3
    public static GetCubicBezierCurveDrawingPoints(vertex1: Point2D, apex: Point2D, vertex2: Point2D): BezierCurvesPointsInfo {
        const p1 = new Vector2D(vertex1.x, vertex1.y);
        const p2 = new Vector2D(apex.x, apex.y);
        const p3 = new Vector2D(vertex2.x, vertex2.y);

        const dir: Vector2D = p1.subtract(p3);

        const controlPointOffset: number = 0.25;
        const cp1 = p2.add(dir.scale(controlPointOffset, controlPointOffset));
        const cp2 = p2.subtract(dir.scale(controlPointOffset, controlPointOffset));

        const controlPoint0_0 = p1.add((cp1.subtract(p1)).scale(2.0 / 3.0, 2.0 / 3.0));
        const controlPoint1_0 = p2.add((cp1.subtract(p2)).scale(2.0 / 3.0, 2.0 / 3.0));

        const controlPoint0_1 = p2.add(cp2.subtract(p2).scale(2.0 / 3.0, 2.0 / 3.0));
        const controlPoint1_1 = p3.add(cp2.subtract(p3).scale(2.0 / 3.0, 2.0 / 3.0));

        const vectorToPoint = (v: Vector2D) => {
            return new Point2D(v.x, v.y);
        }

        const endPoints: Point2D[] = [vectorToPoint(p1), vectorToPoint(p2), vectorToPoint(p3)];
        const controlPoints1: Point2D[] = [vectorToPoint(controlPoint0_0), vectorToPoint(controlPoint0_1)];
        const controlPoints2: Point2D[] = [vectorToPoint(controlPoint1_0), vectorToPoint(controlPoint1_1)];

        return { endPoints, controlPoints1, controlPoints2 };
    }

    public static ApproximateQuadraticBezierCurveWithPolyline(point1: Point2D, point2: Point2D, controlPoint: Point2D) {
        const len: number = Math.round(controlPoint.distanceTo(point1)[0] + controlPoint.distanceTo(point2)[0]);
        const minNumSteps = 25;
        const maxNumSteps = 100;
        const numSteps = this.clamp(len, minNumSteps, maxNumSteps);
        const step = 1.0 / numSteps;

        let points: Point2D[] = [];

        // Iterate t in range [0.0, 1.0] with step, calculating current point on the curve
        for (let t = 0.0; t < 1.0; t += step) {
            t = this.clamp(t, 0.0, 1.0);

            // (1-t)^2 * P0 + 2t * (1-t) * P1 + t * t * P2
            // P0 = point1
            // P1 = controlPoint
            // P2 = point2
            const s1: Vector2D = new Vector2D(point1.x, point1.y).scale(((1 - t) * (1 - t)), ((1 - t) * (1 - t)));
            const s2: Vector2D = new Vector2D(controlPoint.x, controlPoint.y).scale((2 * t * (1 - t)), (2 * t * (1 - t)));
            const s3: Vector2D = new Vector2D(point2.x, point2.y).scale((t * t), (t * t));
            const currPointOnCurve: Vector2D = s1.add(s2.add(s3));

            points.push(new Point2D(currPointOnCurve.x, currPointOnCurve.y));
        }
        return points;
    }

    /// @brief Linear interpolation
    /// @param x	Value used for interpolating a value inside [a, b] interval. x must be in [0, 1] interval
    /// @param a	Start of the [a, b] interval 
    /// @param b	End of the [a, b] interval 
    /// @return		Interpolated value in interval [a, b]
    public static Lerp(x: number, a: number, b: number): number {
        if (a > b)
            [a, b] = [b, a];

        x = this.clamp(x, 0.0, 1.0);
        return a + x * (b - a);
    }

    /// @brief Reversed linear interpolation
    /// @param x  Value inside [a, b] interval to get its weight from [0, 1] in relation to [a, b] interval
    /// @param a  Start of the [a, b] interval 
    /// @param b  End of the [a, b] interval 
    /// @return	  Weight from [0, 1]
    public static Unlerp(x: number, a: number, b: number): number {
        if (a > b)
            [a, b] = [b, a];

        x = this.clamp(x, a, b);

        return b != a ? (x - a) / (b - a) : -1;
    }


    /// @brief Combining lerp and unlerp to linearly map a value from interval [a1, a2] to interval [b1, b2]
    /// @param x	Value inside [a1, a2] interval to be mapped to [b1, b2] interval
    /// @param a1	Start of the [a1, a2] interval 
    /// @param a2	End of the [a1, a2] interval
    /// @param b1	Start of the [b1, b2] interval 
    /// @param b2	End of the [b1, b2] interval
    /// @return		Remapped value inside [b1, b2] interval 
    public static LerpRemap(x: number, a1: number, a2: number, b1: number, b2: number): number {
        if (a1 > a2)
            [a1, a2] = [a2, a1];

        if (b1 > b2)
            [b1, b2] = [b2, b1];

        return this.Lerp(this.Unlerp(x, a1, a2), b1, b2);
    }
}
