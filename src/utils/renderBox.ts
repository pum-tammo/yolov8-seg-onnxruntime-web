interface Box {
  label: string;
  probability: number;
  color: string;
  bounding: [number, number, number, number];
  text?: string;  // OCR-erkannter Text
  confidence?: number;  // OCR Confidence
}

/**
 * Render prediction boxes
 * @param {CanvasRenderingContext2D} ctx canvas context
 * @param {Box[]} boxes boxes array
 */
export const renderBoxes = (ctx: CanvasRenderingContext2D, boxes: Box[]): void => {
  // font configs
  const font = `${Math.max(
    Math.round(Math.max(ctx.canvas.width, ctx.canvas.height) / 40),
    14
  )}px Arial`;
  ctx.font = font;
  ctx.textBaseline = "top";

  boxes.forEach((box) => {
    const klass = box.label;
    const color = box.color;
    const score = (box.probability * 100).toFixed(1);
    const [x1, y1, width, height] = box.bounding;

    // draw border box
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(Math.min(ctx.canvas.width, ctx.canvas.height) / 200, 2.5);
    ctx.strokeRect(x1, y1, width, height);

    // Prepare label text
    let labelText = klass + " - " + score + "%";
    if (box.text) {
      const ocrScore = (box.confidence || 0).toFixed(1);
      labelText = box.text + " (" + ocrScore + "%)";
    }

    // draw the label background.
    ctx.fillStyle = color;
    const textWidth = ctx.measureText(labelText).width;
    const textHeight = parseInt(font, 10); // base 10
    const yText = y1 - (textHeight + ctx.lineWidth);
    ctx.fillRect(
      x1 - 1,
      yText < 0 ? 0 : yText,
      textWidth + ctx.lineWidth,
      textHeight + ctx.lineWidth
    );

    // Draw labels
    ctx.fillStyle = "#ffffff";
    ctx.fillText(labelText, x1 - 1, yText < 0 ? 1 : yText + 1);
  });
};

export class Colors {
  palette: string[];
  n: number;

  // ultralytics color palette https://ultralytics.com/
  constructor() {
    this.palette = [
      "#FF3838",
      "#FF9D97",
      "#FF701F",
      "#FFB21D",
      "#CFD231",
      "#48F90A",
      "#92CC17",
      "#3DDB86",
      "#1A9334",
      "#00D4BB",
      "#2C99A8",
      "#00C2FF",
      "#344593",
      "#6473FF",
      "#0018EC",
      "#8438FF",
      "#520085",
      "#CB38FF",
      "#FF95C8",
      "#FF37C7",
    ];
    this.n = this.palette.length;
  }

  get = (i: number): string => this.palette[Math.floor(i) % this.n];

  static hexToRgba = (hex: string, alpha: number): number[] | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), alpha]
      : null;
  };
}
