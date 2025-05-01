import { ClothAnimation } from "./ClothAnimation.js";
import { FabricType } from "./Cloth.js";
import { Vec3 } from "../lib/TSM.js";

export class ClothControls {
  private animation: ClothAnimation;
  
  // UI Elements
  private simulationSelect: HTMLSelectElement;
  // private windToggle: HTMLInputElement;
  // private windStrength: HTMLInputElement;
  // private windStrengthValue: HTMLSpanElement;
  private resetButton: HTMLButtonElement;
  
  constructor(animation: ClothAnimation) {
    this.animation = animation;
    
    // Get UI elements
    this.simulationSelect = document.getElementById("simulation-select") as HTMLSelectElement;
    // this.windToggle = document.getElementById("toggle-wind") as HTMLInputElement;
    // this.windStrength = document.getElementById("wind-strength") as HTMLInputElement;
    // this.windStrengthValue = document.getElementById("wind-strength-value") as HTMLSpanElement;
    this.resetButton = document.getElementById("reset-simulation") as HTMLButtonElement;
  
    // Initialize UI values
    this.updateUIFromSimulation();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  private updateUIFromSimulation(): void {
    // Set UI values based on current simulation state
    const cloth = this.animation.getCloth();
    
    // Set wind toggle
    // this.windToggle.checked = cloth.windStrength > 0;
    
    // // Set wind strength
    // this.windStrength.value = cloth.windStrength.toString();
    // this.windStrengthValue.textContent = cloth.windStrength.toFixed(1);
  }
  
  private setupEventListeners(): void {
    // Handle simulation type selection
    this.simulationSelect.addEventListener("change", () => {
      const selectedIndex = parseInt(this.simulationSelect.value);
      this.animation.runClothTest(selectedIndex);
      this.updateUIFromSimulation();
    });
    
    // Handle wind toggle
    // this.windToggle.addEventListener("change", () => {
    //   const enabled = this.windToggle.checked;
    //   const strength = parseFloat(this.windStrength.value);
    //   this.animation.toggleWind(enabled, strength);
    // });
    
    // // Handle wind strength changes
    // this.windStrength.addEventListener("input", () => {
    //   const strength = parseFloat(this.windStrength.value);
    //   this.windStrengthValue.textContent = strength.toFixed(1);
      
    //   if (this.windToggle.checked) {
    //     this.animation.toggleWind(true, strength);
    //   }
    // });
    
    // Handle reset button
    this.resetButton.addEventListener("click", () => {
      this.animation.reset();
      this.updateUIFromSimulation();
    });
  }
}