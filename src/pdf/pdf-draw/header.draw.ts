// Header drawing logic for PDF generation

/**
 * Draw the header for content pages.
 *
 * @param doc PDFKit document
 * @param projectId Project ID
 * @param projectName Project name
 * @param logo Logo buffer
 * @param options Additional options (lat/lng, map link position, header height, gap)
 */
export async function drawHeader(
  doc: PDFKit.PDFDocument,
  projectId: number,
  projectName: string,
  logo: Buffer,
  options: {
    latitude?: number;
    longitude?: number;
    mapLinkY?: number;
    mapLinkWidth?: number;
    headerHeight: number;
    gap: number;
  },
) {
  const pageWidth = doc.page.width;
  const headerMargin = 20;
  const headerX = headerMargin;
  const headerY = headerMargin;
  const headerWidth = pageWidth - 2 * headerMargin;
  const headerHeight = options.headerHeight;
  doc.save();
  doc
    .roundedRect(headerX, headerY, headerWidth, headerHeight, 10)
    .fillColor("white")
    .fill();
  doc
    .lineWidth(2)
    .strokeColor("#cccccc")
    .roundedRect(headerX, headerY, headerWidth, headerHeight, 10)
    .stroke();
  doc.restore();

  // --- Left-aligned text ---
  const textX = headerX + 24; // Padding from left
  const textY = headerY + 22; // Padding from top
  doc
    .fontSize(22)
    .fillColor("black")
    .font("Helvetica-Bold")
    .text("Inspection Report", textX, textY, {
      align: "left",
      width: headerWidth / 2 - 10, // Only use left half for text
    });
  doc
    .fontSize(11)
    .fillColor("black")
    .font("Helvetica")
    .text(`Project Name: ${projectName}`, textX, textY + 30, {
      align: "left",
      width: headerWidth / 2 - 10,
    });

  // --- Logo on the right ---
  const logoWidth = 120; // TODO: Move to config
  const logoHeight = 30; // TODO: Move to config
  const logoX = headerX + headerWidth - logoWidth - 20; // Padding from right
  const logoY = headerY + (headerHeight - logoHeight) / 2; // Vertically centered
  doc.image(logo, logoX, logoY, {
    width: logoWidth,
    height: logoHeight,
  });

  // Draw the Google Maps link centered below the map image if Y/width provided
  if (
    options.latitude !== undefined &&
    options.longitude !== undefined &&
    options.mapLinkY !== undefined &&
    options.mapLinkWidth !== undefined
  ) {
    const linkText = "View on Google Maps";
    const linkFontSize = 12;
    doc.fontSize(linkFontSize).fillColor("#007BFF").font("Helvetica-Bold");
    const textWidth = doc.widthOfString(linkText);
    const textHeight = doc.currentLineHeight();
    const linkX =
      doc.page.margins.left + (options.mapLinkWidth - textWidth) / 2;
    doc.text(linkText, linkX, options.mapLinkY, { underline: true });
    const globalMapLink = `https://www.google.com/maps/search/?api=1&query=${options.latitude},${options.longitude}`;
    doc.link(linkX, options.mapLinkY, textWidth, textHeight, globalMapLink);
  }
  doc.y = headerY + headerHeight + options.gap;
}
