// Footer drawing logic for PDF generation

/**
 * Draw the footer with the logo centered at the bottom of the page.
 */
export function drawFooter(
  doc: PDFKit.PDFDocument,
  logo: Buffer,
  isFirstPage: boolean,
  options: {
    logoWidth: number;
    logoHeight: number;
    rightMargin?: number;
    bottomMargin?: number;
  },
) {
  if (!isFirstPage) return;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const logoWidth = options.logoWidth;
  const logoHeight = options.logoHeight;
  const rightMargin = options.rightMargin ?? 30;
  const bottomMargin = options.bottomMargin ?? 60;
  const logoX = pageWidth - logoWidth - rightMargin;
  const logoY = pageHeight - logoHeight - bottomMargin;
  doc.image(logo, logoX, logoY, {
    width: logoWidth,
    height: logoHeight,
  });
}
