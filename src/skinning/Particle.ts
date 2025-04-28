import { Vec3 } from "../lib/TSM.js";
import { Spring } from "./Spring.js";

export class Particle {
  public position: Vec3;
  public oldPosition: Vec3; // For Verlet integration
  public velocity: Vec3;
  public acceleration: Vec3;
  public mass: number;
  public inverseMass: number;
  public isFixed: boolean; // For pinned particles
  public connections: Spring[]; // Springs connected to this particle
  
  constructor(position: Vec3, mass: number = 1.0, isFixed: boolean = false) {
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
  public addForce(force: Vec3): void {
    if (this.isFixed) return;
    
    const acc = force.copy().scale(this.inverseMass);
    this.acceleration.add(acc);
  }
  
  // Update position using Verlet integration
  public update(dt: number): void {
    if (this.isFixed) return;
    
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
  public setFixed(fixed: boolean): void {
    this.isFixed = fixed;
    this.inverseMass = fixed ? 0 : 1.0 / this.mass;
  }
  
  // For Euler integration (alternative to Verlet)
  public updateEuler(dt: number): void {
    if (this.isFixed) return;
    
    // Update velocity
    this.velocity.add(this.acceleration.copy().scale(dt));
    
    // Update position
    this.position.add(this.velocity.copy().scale(dt));
    
    // Reset acceleration for next frame
    this.acceleration = new Vec3([0, 0, 0]);
  }
  
  // Clone this particle
  public clone(): Particle {
    const clone = new Particle(this.position, this.mass, this.isFixed);
    clone.velocity = this.velocity.copy();
    clone.oldPosition = this.oldPosition.copy();
    return clone;
  }
}