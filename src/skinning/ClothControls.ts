import { ClothAnimation } from "./ClothAnimation.js";
import { FabricType, FABRIC_PRESETS } from "./Cloth.js";
import { Vec3 } from "../lib/TSM.js";

export class ClothControls {
  private animation: ClothAnimation;
  
  // UI Elements
  private simulationSelect: HTMLSelectElement;
  private resetButton: HTMLButtonElement;
  
  // Custom parameter UI elements
  private customControlsContainer: HTMLDivElement;
  private fabricTypeSelect: HTMLInputElement;
  private structuralStiffnessSlider: HTMLInputElement;
  private structuralStiffnessValue: HTMLSpanElement;
  private shearStiffnessSlider: HTMLInputElement;
  private shearStiffnessValue: HTMLSpanElement;
  private bendStiffnessSlider: HTMLInputElement;
  private bendStiffnessValue: HTMLSpanElement;
  private dampingSlider: HTMLInputElement;
  private dampingValue: HTMLSpanElement;
  private massSlider: HTMLInputElement;
  private massValue: HTMLSpanElement;
  private stretchFactorSlider: HTMLInputElement;
  private stretchFactorValue: HTMLSpanElement;
  private pinCornersCheckbox: HTMLInputElement;
  private pinCenterCheckbox: HTMLInputElement;
  private resetPinsButton: HTMLButtonElement;
  private clothDensitySlider: HTMLInputElement;
  private clothDensityValue: HTMLSpanElement;
  private windEnabledCheckbox: HTMLInputElement;
  private windStrengthSlider: HTMLInputElement;
  private windStrengthValue: HTMLSpanElement;
  private windDirectionXSlider: HTMLInputElement;
  private windDirectionYSlider: HTMLInputElement;
  private windDirectionZSlider: HTMLInputElement;
  
  // Track if we need to show custom controls
  private isCustomSimulation: boolean = false;
  private customControlsCreated: boolean = false;
  
  constructor(animation: ClothAnimation) {
    this.animation = animation;
    
    // Get UI elements
    this.simulationSelect = document.getElementById("simulation-select") as HTMLSelectElement;
    this.resetButton = document.getElementById("reset-simulation") as HTMLButtonElement;
    this.customControlsContainer = document.getElementById("custom-controls-container") as HTMLDivElement;
    
    if (!this.customControlsContainer) {
      // Create container for custom controls if it doesn't exist
      this.customControlsContainer = document.createElement("div");
      this.customControlsContainer.id = "custom-controls-container";
      
      // Add it after the simulation select control group
      const controlPanel = document.getElementById("controlPanel") as HTMLDivElement;
      const simulationGroup = this.simulationSelect.closest(".control-group") as HTMLDivElement;
      controlPanel.insertBefore(this.customControlsContainer, simulationGroup.nextSibling);
    }
    
    // Initialize UI values
    this.updateUIFromSimulation();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  private updateUIFromSimulation(): void {
    // Check if we need to show/hide custom controls
    const selectedIndex = parseInt(this.simulationSelect.value);
    this.isCustomSimulation = selectedIndex === 8; // Assuming 8 is the index of the Custom Parameters option
    
    // Show/hide custom controls
    this.toggleCustomControls();
  }
  
  private setupEventListeners(): void {
    // Handle simulation type selection
    this.simulationSelect.addEventListener("change", () => {
      const selectedIndex = parseInt(this.simulationSelect.value);
      this.isCustomSimulation = selectedIndex === 8; // Update based on selection
      
      this.animation.runClothTest(selectedIndex);
      this.updateUIFromSimulation();
      this.toggleCustomControls();
    });
    
    // Handle reset button
    this.resetButton.addEventListener("click", () => {
      this.animation.reset();
      this.updateUIFromSimulation();
    });
  }
  
  private toggleCustomControls(): void {
    if (this.isCustomSimulation) {
      // Show custom controls
      if (!this.customControlsCreated) {
        this.createCustomControls();
        this.customControlsCreated = true;
      }
      this.customControlsContainer.style.display = "block";
    } else {
      // Hide custom controls
      this.customControlsContainer.style.display = "none";
    }
  }
  
  private createCustomControls(): void {
    // Clear container
    this.customControlsContainer.innerHTML = "";
    
    // Create control groups
    this.createMaterialPropertiesControls();
    this.createClothConfigurationControls();
    this.createWindControls();
    
    // Set up event listeners for all controls
    this.setupCustomControlEventListeners();
  }
  
  private createMaterialPropertiesControls(): void {
    const materialGroup = document.createElement("div");
    materialGroup.className = "control-group";
    materialGroup.innerHTML = `
      <h4>Material Properties</h4>
      
      <div class="slider-container">
        <label for="structural-stiffness">Structural Stiffness:</label>
        <input type="range" id="structural-stiffness" min="100" max="10000" value="5000" step="100">
        <span id="structural-stiffness-value">5000</span>
      </div>
      
      <div class="slider-container">
        <label for="shear-stiffness">Shear Stiffness:</label>
        <input type="range" id="shear-stiffness" min="10" max="5000" value="100" step="10">
        <span id="shear-stiffness-value">100</span>
      </div>
      
      <div class="slider-container">
        <label for="bend-stiffness">Bend Stiffness:</label>
        <input type="range" id="bend-stiffness" min="1" max="10000" value="10" step="1">
        <span id="bend-stiffness-value">10</span>
      </div>
      
      <div class="slider-container">
        <label for="damping">Damping:</label>
        <input type="range" id="damping" min="0" max="20" value="5" step="0.5">
        <span id="damping-value">5</span>
      </div>
      
      <div class="slider-container">
        <label for="mass">Mass:</label>
        <input type="range" id="mass" min="0.1" max="10" value="1" step="0.1">
        <span id="mass-value">1.0</span>
      </div>
      
      <div class="slider-container">
        <label for="stretch-factor">Stretch Factor:</label>
        <input type="range" id="stretch-factor" min="1.01" max="2" value="1.05" step="0.01">
        <span id="stretch-factor-value">1.05</span>
      </div>
    `;
    
    this.customControlsContainer.appendChild(materialGroup);

    const hiddenFabricTypeInput = document.createElement("input");
    hiddenFabricTypeInput.type = "hidden";
    hiddenFabricTypeInput.id = "fabric-type";
    hiddenFabricTypeInput.value = "0"; // 0 = Cotton
    materialGroup.appendChild(hiddenFabricTypeInput);
    
    // Store references to the controls
    this.fabricTypeSelect = hiddenFabricTypeInput;
    this.structuralStiffnessSlider = document.getElementById("structural-stiffness") as HTMLInputElement;
    this.structuralStiffnessValue = document.getElementById("structural-stiffness-value") as HTMLSpanElement;
    this.shearStiffnessSlider = document.getElementById("shear-stiffness") as HTMLInputElement;
    this.shearStiffnessValue = document.getElementById("shear-stiffness-value") as HTMLSpanElement;
    this.bendStiffnessSlider = document.getElementById("bend-stiffness") as HTMLInputElement;
    this.bendStiffnessValue = document.getElementById("bend-stiffness-value") as HTMLSpanElement;
    this.dampingSlider = document.getElementById("damping") as HTMLInputElement;
    this.dampingValue = document.getElementById("damping-value") as HTMLSpanElement;
    this.massSlider = document.getElementById("mass") as HTMLInputElement;
    this.massValue = document.getElementById("mass-value") as HTMLSpanElement;
    this.stretchFactorSlider = document.getElementById("stretch-factor") as HTMLInputElement;
    this.stretchFactorValue = document.getElementById("stretch-factor-value") as HTMLSpanElement;
  }
  
  private createClothConfigurationControls(): void {
    const clothConfigGroup = document.createElement("div");
    clothConfigGroup.className = "control-group";
    clothConfigGroup.innerHTML = `
      <h4>Cloth Configuration</h4>
      
      <label class="checkbox-label">
        <input type="checkbox" id="pin-corners" checked>
        Pin Corners
      </label>
      
      <label class="checkbox-label">
        <input type="checkbox" id="pin-center">
        Pin Center
      </label>
      
      <div class="slider-container">
        <label for="cloth-density">Cloth Density:</label>
        <input type="range" id="cloth-density" min="5" max="50" value="20" step="1">
        <span id="cloth-density-value">20</span>
      </div>

      <button id="reset-pins">Reset Pin Configuration</button>
    `;
    
    this.customControlsContainer.appendChild(clothConfigGroup);
    
    // Store references to the controls
    this.pinCornersCheckbox = document.getElementById("pin-corners") as HTMLInputElement;
    this.pinCenterCheckbox = document.getElementById("pin-center") as HTMLInputElement;
    this.clothDensitySlider = document.getElementById("cloth-density") as HTMLInputElement;
    this.clothDensityValue = document.getElementById("cloth-density-value") as HTMLSpanElement;
    this.resetPinsButton = document.getElementById("reset-pins") as HTMLButtonElement;
  }
  
  private createWindControls(): void {
    const windGroup = document.createElement("div");
    windGroup.className = "control-group";
    windGroup.innerHTML = `
      <h4>Wind Configuration</h4>
      
      <label class="checkbox-label">
        <input type="checkbox" id="wind-enabled">
        Enable Wind
      </label>
      
      <div class="slider-container">
        <label for="wind-strength">Wind Strength:</label>
        <input type="range" id="wind-strength" min="0" max="100" value="20" step="1">
        <span id="wind-strength-value">20</span>
      </div>
      
      <h5>Wind Direction</h5>
      <div class="slider-container">
        <label for="wind-dir-x">X:</label>
        <input type="range" id="wind-dir-x" min="-1" max="1" value="0" step="0.1">
      </div>
      
      <div class="slider-container">
        <label for="wind-dir-y">Y:</label>
        <input type="range" id="wind-dir-y" min="-1" max="1" value="0" step="0.1">
      </div>
      
      <div class="slider-container">
        <label for="wind-dir-z">Z:</label>
        <input type="range" id="wind-dir-z" min="-1" max="1" value="1" step="0.1">
      </div>
    `;
    
    this.customControlsContainer.appendChild(windGroup);
    
    // Store references to the controls
    this.windEnabledCheckbox = document.getElementById("wind-enabled") as HTMLInputElement;
    this.windStrengthSlider = document.getElementById("wind-strength") as HTMLInputElement;
    this.windStrengthValue = document.getElementById("wind-strength-value") as HTMLSpanElement;
    this.windDirectionXSlider = document.getElementById("wind-dir-x") as HTMLInputElement;
    this.windDirectionYSlider = document.getElementById("wind-dir-y") as HTMLInputElement;
    this.windDirectionZSlider = document.getElementById("wind-dir-z") as HTMLInputElement;
  }
  
  private setupCustomControlEventListeners(): void {
    // Material properties listeners
    this.fabricTypeSelect.addEventListener("change", () => this.updateCustomParameters());
    
    this.structuralStiffnessSlider.addEventListener("input", () => {
      this.structuralStiffnessValue.textContent = this.structuralStiffnessSlider.value;
      this.updateCustomParameters();
    });
    
    this.shearStiffnessSlider.addEventListener("input", () => {
      this.shearStiffnessValue.textContent = this.shearStiffnessSlider.value;
      this.updateCustomParameters();
    });
    
    this.bendStiffnessSlider.addEventListener("input", () => {
      this.bendStiffnessValue.textContent = this.bendStiffnessSlider.value;
      this.updateCustomParameters();
    });
    
    this.dampingSlider.addEventListener("input", () => {
      this.dampingValue.textContent = this.dampingSlider.value;
      this.updateCustomParameters();
    });
    
    this.massSlider.addEventListener("input", () => {
      this.massValue.textContent = parseFloat(this.massSlider.value).toFixed(1);
      this.updateCustomParameters();
    });
    
    this.stretchFactorSlider.addEventListener("input", () => {
      this.stretchFactorValue.textContent = parseFloat(this.stretchFactorSlider.value).toFixed(2);
      this.updateCustomParameters();
    });
    
    // Cloth configuration listeners
    this.pinCornersCheckbox.addEventListener("change", () => this.updateCustomParameters());
    this.pinCenterCheckbox.addEventListener("change", () => this.updateCustomParameters());
    
    this.resetPinsButton.addEventListener("click", () => {
      // Call a method to explicitly reset pins
      this.resetPinConfiguration();
    });

    this.clothDensitySlider.addEventListener("input", () => {
      this.clothDensityValue.textContent = this.clothDensitySlider.value;
      // Only update when slider release, as changing density requires recreating the cloth
    });
    
    this.clothDensitySlider.addEventListener("change", () => {
      this.updateCustomParameters();
    });
    
    // Wind configuration listeners
    this.windEnabledCheckbox.addEventListener("change", () => {
      // Enable/disable wind strength slider based on checkbox
      this.windStrengthSlider.disabled = !this.windEnabledCheckbox.checked;
      this.windDirectionXSlider.disabled = !this.windEnabledCheckbox.checked;
      this.windDirectionYSlider.disabled = !this.windEnabledCheckbox.checked;
      this.windDirectionZSlider.disabled = !this.windEnabledCheckbox.checked;
      
      this.updateCustomParameters();
    });
    
    this.windStrengthSlider.addEventListener("input", () => {
      this.windStrengthValue.textContent = this.windStrengthSlider.value;
      this.updateCustomParameters();
    });
    
    // Wind direction listeners
    const updateWindDirection = () => {
      this.updateCustomParameters();
    };
    
    this.windDirectionXSlider.addEventListener("input", updateWindDirection);
    this.windDirectionYSlider.addEventListener("input", updateWindDirection);
    this.windDirectionZSlider.addEventListener("input", updateWindDirection);
  }
  
  private updateCustomParameters(): void {
    if (!this.isCustomSimulation) return;
    
    // Gather all parameter values
    const params: any = {};
    
    // Material properties
    params.fabricType = parseInt(this.fabricTypeSelect.value);
    params.structuralStiffness = parseFloat(this.structuralStiffnessSlider.value);
    params.shearStiffness = parseFloat(this.shearStiffnessSlider.value);
    params.bendStiffness = parseFloat(this.bendStiffnessSlider.value);
    params.damping = parseFloat(this.dampingSlider.value);
    params.mass = parseFloat(this.massSlider.value);
    params.stretchFactor = parseFloat(this.stretchFactorSlider.value);
    
    // Cloth configuration
    params.pinCorners = this.pinCornersCheckbox.checked;
    params.pinCenter = this.pinCenterCheckbox.checked;
    params.clothDensity = parseInt(this.clothDensitySlider.value);
    
    // Wind configuration
    params.windEnabled = this.windEnabledCheckbox.checked;
    params.windStrength = parseFloat(this.windStrengthSlider.value);
    
    // Create wind direction vector
    const x = parseFloat(this.windDirectionXSlider.value);
    const y = parseFloat(this.windDirectionYSlider.value);
    const z = parseFloat(this.windDirectionZSlider.value);
    
    // Only update wind direction if not all zeros (to avoid normalization issues)
    if (x !== 0 || y !== 0 || z !== 0) {
      params.windDirection = new Vec3([x, y, z]);
    }
    
    // Update the simulation
    this.animation.updateCustomParameters(params);
  }
  
  // Public method to update UI from simulation state
  public updateControlsFromSimulation(): void {
    if (!this.customControlsCreated || !this.isCustomSimulation) return;
    
    // Get cloth and its properties
    const cloth = this.animation.getCloth();
    if (!cloth) return;
    
    // Get fabric type
    const fabricType = this.animation.getFabricType();
    this.fabricTypeSelect.value = fabricType.toString();
    
    // Get fabric properties
    const fabricProps = FABRIC_PRESETS.get(fabricType)!;
    
    // Update material sliders
    this.structuralStiffnessSlider.value = fabricProps.structuralStiffness.toString();
    this.structuralStiffnessValue.textContent = fabricProps.structuralStiffness.toString();
    
    this.shearStiffnessSlider.value = fabricProps.shearStiffness.toString();
    this.shearStiffnessValue.textContent = fabricProps.shearStiffness.toString();
    
    this.bendStiffnessSlider.value = fabricProps.bendStiffness.toString();
    this.bendStiffnessValue.textContent = fabricProps.bendStiffness.toString();
    
    this.dampingSlider.value = fabricProps.damping.toString();
    this.dampingValue.textContent = fabricProps.damping.toString();
    
    this.massSlider.value = fabricProps.mass.toString();
    this.massValue.textContent = fabricProps.mass.toFixed(1);
    
    this.stretchFactorSlider.value = fabricProps.stretchFactor.toString();
    this.stretchFactorValue.textContent = fabricProps.stretchFactor.toFixed(2);
    
    // Get test configuration
    const testConfig = this.animation.getCurrentTestConfig();
    if (!testConfig) return;
    
    // Update cloth configuration controls
    this.pinCornersCheckbox.checked = testConfig.pinCorners;
    this.pinCenterCheckbox.checked = testConfig.pinCenter;
    this.clothDensitySlider.value = testConfig.clothDensity.toString();
    this.clothDensityValue.textContent = testConfig.clothDensity.toString();
    
    // Update wind controls
    this.windEnabledCheckbox.checked = testConfig.windEnabled;
    this.windStrengthSlider.value = testConfig.windStrength.toString();
    this.windStrengthValue.textContent = testConfig.windStrength.toString();
    this.windStrengthSlider.disabled = !testConfig.windEnabled;
    
    // Update wind direction
    this.windDirectionXSlider.value = testConfig.windDirection.x.toFixed(1);
    this.windDirectionYSlider.value = testConfig.windDirection.y.toFixed(1);
    this.windDirectionZSlider.value = testConfig.windDirection.z.toFixed(1);
    this.windDirectionXSlider.disabled = !testConfig.windEnabled;
    this.windDirectionYSlider.disabled = !testConfig.windEnabled;
    this.windDirectionZSlider.disabled = !testConfig.windEnabled;

    if (!testConfig.windEnabled) {
      // If we have direct access to cloth, explicitly set wind to 0
      cloth.windStrength = 0;
    }
  }

  private resetPinConfiguration(): void {
    if (!this.isCustomSimulation) return;
    
    // Create parameters with only pin configuration
    const params: any = {
      pinCorners: this.pinCornersCheckbox.checked,
      pinCenter: this.pinCenterCheckbox.checked,
      resetPins: true // Add this flag to indicate explicit reset
    };
    
    // Update the simulation
    this.animation.updateCustomParameters(params);
  }
}