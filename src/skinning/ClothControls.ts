import { ClothAnimation } from "./ClothAnimation.js";
import { FabricType } from "./Cloth.js";
import { Vec3 } from "../lib/TSM.js";

export class ClothControls {
  private animation: ClothAnimation;
  
  // UI Elements
  private simulationSelect: HTMLSelectElement;
  private windToggle: HTMLInputElement;
  private windStrength: HTMLInputElement;
  private windStrengthValue: HTMLSpanElement;
  private resetButton: HTMLButtonElement;
  private gravityStrength: HTMLInputElement;
  private gravityStrengthValue: HTMLSpanElement;
  
  constructor(animation: ClothAnimation) {
    this.animation = animation;
    
    // Get UI elements
    this.simulationSelect = document.getElementById("simulation-select") as HTMLSelectElement;
    this.windToggle = document.getElementById("toggle-wind") as HTMLInputElement;
    this.windStrength = document.getElementById("wind-strength") as HTMLInputElement;
    this.windStrengthValue = document.getElementById("wind-strength-value") as HTMLSpanElement;
    this.resetButton = document.getElementById("reset-simulation") as HTMLButtonElement;
    this.gravityStrength = document.getElementById("gravity-strength") as HTMLInputElement;
    this.gravityStrengthValue = document.getElementById("gravity-strength-value") as HTMLSpanElement;
    
    // Initialize UI values
    this.updateUIFromSimulation();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  private updateUIFromSimulation(): void {
    // Set UI values based on current simulation state
    const cloth = this.animation.getCloth();
    
    // Set wind toggle
    this.windToggle.checked = cloth.windStrength > 0;
    
    // Set wind strength
    this.windStrength.value = cloth.windStrength.toString();
    this.windStrengthValue.textContent = cloth.windStrength.toFixed(1);
    
    // Set gravity strength
    this.gravityStrength.value = Math.abs(cloth.gravity.y).toString();
    this.gravityStrengthValue.textContent = Math.abs(cloth.gravity.y).toFixed(1);
  }
  
  private setupEventListeners(): void {
    // Handle simulation type selection
    this.simulationSelect.addEventListener("change", () => {
      const selectedIndex = parseInt(this.simulationSelect.value);
      this.animation.runClothTest(selectedIndex);
      this.updateUIFromSimulation();
    });
    
    // Handle wind toggle
    this.windToggle.addEventListener("change", () => {
      const enabled = this.windToggle.checked;
      const strength = parseFloat(this.windStrength.value);
      this.animation.toggleWind(enabled, strength);
    });
    
    // Handle wind strength changes
    this.windStrength.addEventListener("input", () => {
      const strength = parseFloat(this.windStrength.value);
      this.windStrengthValue.textContent = strength.toFixed(1);
      
      if (this.windToggle.checked) {
        this.animation.toggleWind(true, strength);
      }
    });
    
    // Handle reset button
    this.resetButton.addEventListener("click", () => {
      this.animation.reset();
      this.updateUIFromSimulation();
    });
    
    // Handle gravity strength changes
    this.gravityStrength.addEventListener("input", () => {
      const strength = parseFloat(this.gravityStrength.value);
      this.gravityStrengthValue.textContent = strength.toFixed(1);
      
      const cloth = this.animation.getCloth();
      cloth.gravity = new Vec3([0, -strength, 0]);
    });
  }
}