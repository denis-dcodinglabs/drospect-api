// Panel section drawing logic for PDF generation
import fetch from "node-fetch";
import { formatImageName } from "../pdf-utils/image.util";
import { drawDetectionRectanglesTransformed } from "./detection.draw";

/**
 * Draw a full section for an individual image including its image, map preview, and panel info.
 */
export async function drawPanelSection(
  doc: PDFKit.PDFDocument,
  image: any,
  imageBuffer: Buffer,
  options: {
    imageHeight: number;
    gap: number;
    mapboxToken: string;
    drawDetectionRectangles: (
      doc: PDFKit.PDFDocument,
      panelInfo: any[],
      imageX: number,
      imageY: number,
      imageWidth: number,
      imageHeight: number,
      imageName?: string,
    ) => void;
    drawCleanPanelTable: (
      doc: PDFKit.PDFDocument,
      panelInfo: any[],
      x: number,
      y: number,
    ) => number;
    preFetchedMapBuffer?: Buffer | null;
  },
) {
  const startY = doc.y;
  const totalWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  let panelInfo = Array.isArray(image.panelInformation)
    ? image.panelInformation
    : [];

  // Ensure each panel carries a highestReason if available at the image level
  const parentReason =
    image.highestReason || image.reasonDetected || image.ReasonDetected;
  if (parentReason) {
    panelInfo = panelInfo.map((p: any) => ({
      ...p,
      highestReason: p.highestReason || p.HighestReason || parentReason,
    }));
  }

  const colWidth = totalWidth / 3;
  const col1X = doc.page.margins.left;
  const col2X = col1X + colWidth;
  const col3X = col2X + colWidth;

  // Column 1: Image with rounded corners and detection rectangles
  const imageDisplayX = col1X + 10;
  const imageDisplayY = startY + 10;
  const imageDisplayWidth = colWidth - 20;
  const imageDisplayHeight = options.imageHeight;

  // Draw image and rectangles using a transform from original pixel space
  // Determine original dimensions based on image type if not embedded
  const isVImage = image.imageName && image.imageName.includes("V");
  const origWidth = isVImage ? 1920 : 640;
  const origHeight = isVImage ? 1440 : 512;

  // Compute uniform scale to fit image inside display rect while preserving aspect ratio
  const scale = Math.min(
    imageDisplayWidth / origWidth,
    imageDisplayHeight / origHeight,
  );
  const offsetX = (imageDisplayWidth - origWidth * scale) / 2;
  const offsetY = (imageDisplayHeight - origHeight * scale) / 2;

  // Clip to the rounded display rect, then translate/scale into original pixel space
  doc.save();
  doc
    .roundedRect(
      imageDisplayX,
      imageDisplayY,
      imageDisplayWidth,
      imageDisplayHeight,
      12,
    )
    .clip();
  doc.translate(imageDisplayX + offsetX, imageDisplayY + offsetY);
  doc.scale(scale, scale);

  // Draw the image at its origin using intrinsic/original size
  doc.image(imageBuffer, 0, 0, { width: origWidth, height: origHeight });

  // Ensure consistent final stroke width of ~2pt after scaling
  doc.lineWidth(2 / scale);
  drawDetectionRectanglesTransformed(doc, panelInfo, origWidth, origHeight);
  doc.restore();

  // Column 2: Clean image details and panel info
  const infoY = startY + 20;
  const shortImageName = formatImageName(image.imageName);
  doc
    .fontSize(11)
    .fillColor("#333")
    .font("Helvetica-Bold")
    .text(shortImageName, col2X + 10, infoY);
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${image.latitude},${image.longitude}`;
  doc
    .fontSize(9)
    .fillColor("#007BFF")
    .font("Helvetica")
    .text("View on Google Maps", col2X + 10, infoY + 18, {
      link: mapLink,
      underline: true,
      width: colWidth - 20,
    });
  let panelInfoEndY = infoY + 40;
  if (panelInfo.length > 0) {
    panelInfoEndY = options.drawCleanPanelTable(
      doc,
      panelInfo,
      col2X + 10,
      infoY + 40,
    );
  } else {
    doc
      .fontSize(9)
      .fillColor("#666")
      .font("Helvetica")
      .text("No panel information available", col2X + 10, infoY + 40);
    panelInfoEndY = infoY + 60;
  }

  // Column 3: Clean map preview - use pre-fetched buffer if available
  let mapBuffer: Buffer | null = options.preFetchedMapBuffer || null;

  if (!mapBuffer) {
    // Fallback to fetching map if pre-fetched buffer is not available
    try {
      const mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/pin-l+ff0000(${image.longitude},${image.latitude})/${image.longitude},${image.latitude},15/300x150@2x?access_token=${options.mapboxToken}`;
      const res = await fetch(mapboxUrl);
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType?.startsWith("image/")) {
        throw new Error("Map fetch failed");
      }
      mapBuffer = await res.buffer();
    } catch {
      console.error(`Failed to fetch map for image ${image.imageName}`);
    }
  }

  if (mapBuffer) {
    doc.save();
    doc
      .roundedRect(
        col3X + 10,
        startY + 10,
        colWidth - 20,
        options.imageHeight - 10,
        8,
      )
      .clip();
    doc.image(mapBuffer, col3X + 10, startY + 10, {
      width: colWidth - 20,
      height: options.imageHeight - 10,
    });
    doc.restore();
  } else {
    doc
      .fontSize(8)
      .fillColor("#666")
      .text("Map preview unavailable", col3X + 10, startY + 20);
  }

  // Calculate the actual section height based on the highest content (image/map vs panel info)
  const imageEndY = startY + 10 + options.imageHeight;
  const actualSectionHeight = Math.max(imageEndY, panelInfoEndY) - startY;
  doc.y = startY + actualSectionHeight + options.gap;
}
