import { ClothAnimation } from "./ClothAnimation.js";
import { ClothControls } from "./ClothControls.js";
export function initializeCanvas() {
    const canvas = document.getElementById("glCanvas");
    /* Start cloth animation */
    const clothAnimation = new ClothAnimation(canvas);
    /* Initialize UI controls */
    const clothControls = new ClothControls(clothAnimation);
    // Store reference to controls in GUI for updates
    if (clothAnimation.getGUI) {
        const gui = clothAnimation.getGUI();
        if (gui) {
            gui.clothControls = clothControls;
        }
    }
    /* Start animation loop */
    clothAnimation.start();
}
// Initialize when page loads
window.onload = initializeCanvas;
//# sourceMappingURL=index.js.map