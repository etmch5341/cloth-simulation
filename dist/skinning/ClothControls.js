import { Vec3 } from "../lib/TSM.js";
export class ClothControls {
    constructor(animation) {
        this.animation = animation;
        // Get UI elements
        this.simulationSelect = document.getElementById("simulation-select");
        this.windToggle = document.getElementById("toggle-wind");
        this.windStrength = document.getElementById("wind-strength");
        this.windStrengthValue = document.getElementById("wind-strength-value");
        this.resetButton = document.getElementById("reset-simulation");
        this.gravityStrength = document.getElementById("gravity-strength");
        this.gravityStrengthValue = document.getElementById("gravity-strength-value");
        // Initialize UI values
        this.updateUIFromSimulation();
        // Set up event listeners
        this.setupEventListeners();
    }
    updateUIFromSimulation() {
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
    setupEventListeners() {
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
//# sourceMappingURL=ClothControls.js.map