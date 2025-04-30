export class ClothControls {
    constructor(animation) {
        this.animation = animation;
        // Get UI elements
        this.simulationSelect = document.getElementById("simulation-select");
        this.windToggle = document.getElementById("toggle-wind");
        this.windStrength = document.getElementById("wind-strength");
        this.windStrengthValue = document.getElementById("wind-strength-value");
        this.resetButton = document.getElementById("reset-simulation");
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
    }
}
//# sourceMappingURL=ClothControls.js.map