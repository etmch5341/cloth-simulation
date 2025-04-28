import { ClothAnimation } from "./ClothAnimation.js";
export function initializeCanvas() {
    const canvas = document.getElementById("glCanvas");
    /* Start drawing */
    const canvasAnimation = new ClothAnimation(canvas);
    canvasAnimation.start();
}
initializeCanvas();
//# sourceMappingURL=index.js.map