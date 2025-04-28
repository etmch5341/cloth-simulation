import { Vec3 } from "../lib/TSM.js";
// Sphere collider implementation
export class SphereCollider {
    constructor(center, radius) {
        this.center = center;
        this.radius = radius;
    }
    checkCollision(point, radius) {
        const direction = point.copy().subtract(this.center);
        const distance = direction.length();
        const minDistance = this.radius + radius;
        if (distance < minDistance) {
            // Calculate penetration vector
            direction.normalize();
            const penetration = direction.scale(minDistance - distance);
            return { collides: true, penetration };
        }
        return { collides: false, penetration: new Vec3([0, 0, 0]) };
    }
}
// Box collider implementation
export class BoxCollider {
    constructor(center, size) {
        this.center = center;
        this.size = size;
        this.halfSize = size.copy().scale(0.5);
    }
    checkCollision(point, radius) {
        // Transform point to box local space
        const localPoint = point.copy().subtract(this.center);
        // Find closest point on box
        const closestPoint = new Vec3([
            Math.max(-this.halfSize.x, Math.min(this.halfSize.x, localPoint.x)),
            Math.max(-this.halfSize.y, Math.min(this.halfSize.y, localPoint.y)),
            Math.max(-this.halfSize.z, Math.min(this.halfSize.z, localPoint.z))
        ]);
        // Calculate distance to closest point
        const direction = localPoint.copy().subtract(closestPoint);
        const distance = direction.length();
        // Check if point is inside the box (adjusted by radius)
        if (distance < radius) {
            // If distance is zero, point is inside box, choose arbitrary direction
            if (distance < 1e-6) {
                // Find closest face and push out in that direction
                let minDist = this.halfSize.x - Math.abs(localPoint.x);
                let axis = new Vec3([localPoint.x > 0 ? 1 : -1, 0, 0]);
                if (this.halfSize.y - Math.abs(localPoint.y) < minDist) {
                    minDist = this.halfSize.y - Math.abs(localPoint.y);
                    axis = new Vec3([0, localPoint.y > 0 ? 1 : -1, 0]);
                }
                if (this.halfSize.z - Math.abs(localPoint.z) < minDist) {
                    minDist = this.halfSize.z - Math.abs(localPoint.z);
                    axis = new Vec3([0, 0, localPoint.z > 0 ? 1 : -1]);
                }
                const penetration = axis.scale(radius + minDist);
                return { collides: true, penetration };
            }
            else {
                const penetration = direction.normalize().scale(radius - distance);
                return { collides: true, penetration };
            }
        }
        return { collides: false, penetration: new Vec3([0, 0, 0]) };
    }
}
// Plane collider implementation
export class PlaneCollider {
    constructor(point, normal) {
        this.point = point;
        this.normal = normal.normalize();
    }
    checkCollision(point, radius) {
        // Calculate signed distance from point to plane
        const dirToPoint = point.copy().subtract(this.point);
        const signedDistance = Vec3.dot(dirToPoint, this.normal);
        // If point is behind plane (adjusted by radius)
        if (signedDistance < radius) {
            const penetration = this.normal.copy().scale(radius - signedDistance);
            return { collides: true, penetration };
        }
        return { collides: false, penetration: new Vec3([0, 0, 0]) };
    }
}
//# sourceMappingURL=CollisionObjects.js.map