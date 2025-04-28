import { ClothAnimation } from "./ClothAnimation.js";

export function initializeCanvas(): void {
  const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
  /* Start drawing */
  const canvasAnimation: ClothAnimation = new ClothAnimation(canvas);
  canvasAnimation.start();
}

initializeCanvas();