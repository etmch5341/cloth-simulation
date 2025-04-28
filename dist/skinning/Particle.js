import { Vec3 } from "../lib/TSM.js";
export class Particle {
    constructor(position, mass = 1.0, isFixed = false) {
        this.position = position.copy();
        this.oldPosition = position.copy();
        this.velocity = new Vec3([0, 0, 0]);
        this.acceleration = new Vec3([0, 0, 0]);
        this.mass = mass;
        this.inverseMass = isFixed ? 0 : 1.0 / mass;
        this.isFixed = isFixed;
        this.connections = [];
    }
    // Add forces to the particle
    addForce(force) {
        if (this.isFixed)
            return;
        const acc = force.copy().scale(this.inverseMass);
        this.acceleration.add(acc);
    }
    // Update position using Verlet integration
    update(dt) {
        if (this.isFixed)
            return;
        // Store current position for next iteration
        const temp = this.position.copy();
        // Update position using Verlet integration
        const newPos = this.position.copy().scale(2)
            .subtract(this.oldPosition)
            .add(this.acceleration.copy().scale(dt * dt));
        // Update velocity for force calculations
        this.velocity = newPos.copy().subtract(this.position).scale(1.0 / dt);
        // Update positions
        this.oldPosition = temp;
        this.position = newPos;
        // Reset acceleration for next frame
        this.acceleration = new Vec3([0, 0, 0]);
    }
    // Pin/unpin the particle
    setFixed(fixed) {
        this.isFixed = fixed;
        this.inverseMass = fixed ? 0 : 1.0 / this.mass;
    }
    // For Euler integration (alternative to Verlet)
    updateEuler(dt) {
        if (this.isFixed)
            return;
        // Update velocity
        this.velocity.add(this.acceleration.copy().scale(dt));
        // Update position
        this.position.add(this.velocity.copy().scale(dt));
        // Reset acceleration for next frame
        this.acceleration = new Vec3([0, 0, 0]);
    }
    // Clone this particle
    clone() {
        const clone = new Particle(this.position, this.mass, this.isFixed);
        clone.velocity = this.velocity.copy();
        clone.oldPosition = this.oldPosition.copy();
        return clone;
    }
}
//# sourceMappingURL=Particle.js.map