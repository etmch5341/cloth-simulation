import { Vec3 } from "../lib/TSM.js";
import { Particle } from "./Particle.js";

export enum SpringType {
  STRUCTURAL,
  SHEAR,
  BEND
}

export class Spring {
  public particleA: Particle;
  public particleB: Particle;
  public restLength: number;
  public stiffness: number; // Spring constant
  public damping: number;   // Damping factor
  public type: SpringType;  // Type of spring for visualization
  public broken: boolean = false;
  
  constructor(a: Particle, b: Particle, stiffness: number = 10.0, damping: number = 0.5, type: SpringType = SpringType.STRUCTURAL) {
    this.particleA = a;
    this.particleB = b;
    this.restLength = Vec3.distance(a.position, b.position);
    this.stiffness = stiffness;
    this.damping = damping;
    this.type = type;
    
    // Add reference to this spring to both particles
    this.particleA.connections.push(this);
    this.particleB.connections.push(this);
  }
  
  // Apply spring forces to both particles
  public update(): void {
    if (this.broken) return;
    
    const direction = this.particleB.position.copy().subtract(this.particleA.position);
    const currentLength = direction.length();
    
    // Avoid division by zero
    if (currentLength === 0) return;
    
    // Calculate stretch force (Hooke's Law: F = -k(x - x₀))
    const stretch = currentLength - this.restLength;
    direction.normalize();
    
    // Get velocity component along spring direction
    const velA = Vec3.dot(this.particleA.velocity, direction);
    const velB = Vec3.dot(this.particleB.velocity, direction);
    
    // Calculate damping force (F = -c(v))
    const damping = (velB - velA) * this.damping;
    
    // Calculate total force magnitude
    const force = this.stiffness * stretch + damping;
    
    // Apply forces
    const forceVec = direction.copy().scale(force);
    
    if (!this.particleA.isFixed) {
      this.particleA.addForce(forceVec);
    }
    
    if (!this.particleB.isFixed) {
      this.particleB.addForce(forceVec.negate());
    }
  }
  
  // Position-based dynamics constraint solver
  public solveConstraint(compliance: number = 0.0): void {
    if (this.broken || (this.particleA.isFixed && this.particleB.isFixed)) return;
    
    const direction = this.particleB.position.copy().subtract(this.particleA.position);
    const currentLength = direction.length();
    
    if (currentLength === 0) return;
    
    direction.normalize();
    const difference = (currentLength - this.restLength) / 
                      (this.particleA.inverseMass + this.particleB.inverseMass);
    
    // Apply correction based on inverse mass
    if (!this.particleA.isFixed) {
      this.particleA.position.add(direction.copy().scale(difference * this.particleA.inverseMass));
    }
    
    if (!this.particleB.isFixed) {
      this.particleB.position.subtract(direction.copy().scale(difference * this.particleB.inverseMass));
    }
  }
  
  // Break this spring if it's stretched beyond the breaking point
  public checkBreak(breakFactor: number = 1.5): boolean {
    if (this.broken) return true;
    
    const currentLength = Vec3.distance(this.particleA.position, this.particleB.position);
    if (currentLength > this.restLength * breakFactor) {
      this.broken = true;
      return true;
    }
    
    return false;
  }
}