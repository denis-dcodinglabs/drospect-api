// Detection rectangles drawing logic for PDF generation

/**
 * Draw detection rectangles on thermal images to highlight problem areas
 */
export function drawDetectionRectangles(
  doc: PDFKit.PDFDocument,
  panelInfo: any[],
  imageX: number,
  imageY: number,
  imageWidth: number,
  imageHeight: number,
  imageName?: string,
  options?: {
    thermalWidth?: number;
    thermalHeight?: number;
    rgbWidth?: number;
    rgbHeight?: number;
  },
) {
  if (!panelInfo || panelInfo.length === 0) return;
  // Clip all subsequent drawings to the image bounds to avoid overflow
  doc.save();
  doc.rect(imageX, imageY, imageWidth, imageHeight).clip();
  // Check if this is a V image (RGB model) or other type
  const isVImage = imageName && imageName.includes("V");
  let FIXED_ORIGINAL_WIDTH, FIXED_ORIGINAL_HEIGHT, yOffset;
  if (isVImage) {
    FIXED_ORIGINAL_WIDTH = options?.rgbWidth ?? 1920;
    FIXED_ORIGINAL_HEIGHT = options?.rgbHeight ?? 1440;
    // Keep RGB unchanged; focus tuning on thermal
    yOffset = 0;
  } else {
    FIXED_ORIGINAL_WIDTH = options?.thermalWidth ?? 640;
    FIXED_ORIGINAL_HEIGHT = options?.thermalHeight ?? 512;
    yOffset = -0;
  }
  panelInfo.forEach((panel) => {
    const coordinates = panel.coordinates || panel.Coordinates;
    if (!coordinates) return;
    const { min_x, min_y, max_x, max_y } = coordinates;
    const isRelative = max_x <= 1 && max_y <= 1 && min_x <= 1 && min_y <= 1;
    let rectX, rectY, rectWidth, rectHeight;
    // Normalized center Y of the rectangle in original space [0..1]
    const centerYNorm = isRelative
      ? (min_y + max_y) / 2
      : (min_y + max_y) / 2 / FIXED_ORIGINAL_HEIGHT;

    if (isRelative) {
      rectX = imageX + min_x * imageWidth;
      rectY = imageY + min_y * imageHeight + yOffset;
      rectWidth = (max_x - min_x) * imageWidth;
      rectHeight = (max_y - min_y) * imageHeight;
    } else {
      rectX = imageX + (min_x / FIXED_ORIGINAL_WIDTH) * imageWidth;
      rectY = imageY + (min_y / FIXED_ORIGINAL_HEIGHT) * imageHeight + yOffset;
      rectWidth = ((max_x - min_x) / FIXED_ORIGINAL_WIDTH) * imageWidth;
      rectHeight = ((max_y - min_y) / FIXED_ORIGINAL_HEIGHT) * imageHeight;
    }

    // Thermal-only dynamic vertical correction: apply upward adjustment that
    // increases toward the bottom half but is zero at the top half.
    if (!isVImage) {
      // Start adjusting below the top third; scale to 0..1 across the bottom 2/3
      const startThreshold = 1 / 3; // ~0.333
      const range = 1 - startThreshold; // 2/3
      const normalized = Math.max(0, (centerYNorm - startThreshold) / range); // 0..1
      const adjustmentFactor = 0.25; // up to 12% of image height at very bottom
      rectY += -adjustmentFactor * normalized * imageHeight;
    }
    const deltaValue = parseFloat(panel.deltaTemp || panel.Delta || 0);
    let strokeColor = "#00FFFF";
    if (deltaValue >= 15) {
      strokeColor = "#FF0000";
    } else if (deltaValue >= 10) {
      strokeColor = "#FFFF00";
    }
    doc
      .save()
      .lineWidth(2)
      .strokeColor(strokeColor)
      .rect(rectX, rectY, rectWidth, rectHeight)
      .stroke()
      .restore();
  });
  // Restore after clipping so following drawings aren't affected
  doc.restore();
}

/**
 * Draw detection rectangles assuming the current PDF context is transformed
 * into the image's original pixel coordinate system.
 * - Caller should set a uniform scale transform and appropriate lineWidth
 *   (e.g., 2 / scale) prior to invoking this function.
 * - Coordinates may be normalized [0..1] or absolute pixel values.
 */
export function drawDetectionRectanglesTransformed(
  doc: PDFKit.PDFDocument,
  panelInfo: any[],
  originalWidth: number,
  originalHeight: number,
) {
  if (!panelInfo || panelInfo.length === 0) return;

  panelInfo.forEach((panel) => {
    const coordinates = panel.coordinates || panel.Coordinates;
    if (!coordinates) return;
    const { min_x, min_y, max_x, max_y } = coordinates;
    const isRelative = max_x <= 1 && max_y <= 1 && min_x <= 1 && min_y <= 1;

    const x0 = isRelative ? min_x * originalWidth : min_x;
    const y0 = isRelative ? min_y * originalHeight : min_y;
    const w = isRelative ? (max_x - min_x) * originalWidth : max_x - min_x;
    const h = isRelative ? (max_y - min_y) * originalHeight : max_y - min_y;

    // Keep stroke color logic consistent with existing behavior
    const deltaValue = parseFloat(panel.deltaTemp || panel.Delta || 0);
    let strokeColor = "#00FFFF";
    if (deltaValue >= 15) {
      strokeColor = "#FF0000";
    } else if (deltaValue >= 10) {
      strokeColor = "#FFFF00";
    }

    doc.save().strokeColor(strokeColor).rect(x0, y0, w, h).stroke().restore();
  });
}
