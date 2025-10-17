// Table rendering logic for PDF generation

/**
 * Render the table for panel information in a given section.
 */
export function drawPanelTable(
  doc: PDFKit.PDFDocument,
  panelInfo: any[],
  x: number,
  y: number,
  columnWidths: { module: number; delta: number },
) {
  const rowHeight = 16;
  // Header row for panel table
  doc
    .fontSize(10)
    .fillColor("black")
    .text("Module", x, y)
    .text("Delta (°C)", x + columnWidths.module, y);
  y += rowHeight;
  // Render each row with panel info
  panelInfo.forEach((info) => {
    doc
      .fontSize(9)
      .fillColor("#333")
      .text(`#${info.PanelNumber}`, x, y)
      .text(`${info.Delta}°C`, x + columnWidths.module, y);
    y += rowHeight;
  });
  return y;
}

/**
 * Render an enhanced table for panel information with better styling.
 */
export function drawEnhancedPanelTable(
  doc: PDFKit.PDFDocument,
  panelInfo: any[],
  x: number,
  y: number,
  columnWidths: { module: number; delta: number },
) {
  const rowHeight = 18;
  const tableWidth = columnWidths.module + columnWidths.delta;
  const headerHeight = 22;
  // Table header background
  doc
    .save()
    .fillColor("#FF7A1910")
    .roundedRect(x - 5, y - 3, tableWidth + 10, headerHeight, 4)
    .fill()
    .restore();
  // Header row with better styling
  doc
    .fontSize(9)
    .fillColor("#FF7A19")
    .font("Helvetica-Bold")
    .text("Module", x, y + 5)
    .text("Delta (°C)", x + columnWidths.module, y + 5);
  y += headerHeight;
  // Add a subtle line under header
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#FF7A1930")
    .moveTo(x - 5, y)
    .lineTo(x + tableWidth + 5, y)
    .stroke()
    .restore();
  y += 5;
  // Render each row with enhanced styling
  panelInfo.slice(0, 6).forEach((info, index) => {
    const isEvenRow = index % 2 === 0;
    if (isEvenRow) {
      doc
        .save()
        .fillColor("#f8f9fa")
        .roundedRect(x - 5, y - 2, tableWidth + 10, rowHeight - 2, 3)
        .fill()
        .restore();
    }
    const deltaValue = parseFloat(info.Delta);
    let deltaColor = "#28a745";
    if (deltaValue > 10) {
      deltaColor = "#dc3545";
    } else if (deltaValue > 5) {
      deltaColor = "#ffc107";
    }
    doc
      .fontSize(8)
      .fillColor("#333")
      .font("Helvetica")
      .text(`#${info.PanelNumber}`, x, y + 3);
    doc
      .fontSize(8)
      .fillColor(deltaColor)
      .font("Helvetica-Bold")
      .text(`${info.Delta}°C`, x + columnWidths.module, y + 3);
    y += rowHeight;
  });
  if (panelInfo.length > 6) {
    doc
      .fontSize(7)
      .fillColor("#999")
      .font("Helvetica-Oblique")
      .text(`... and ${panelInfo.length - 6} more panels`, x, y + 5);
  }
  return y;
}

/**
 * Render panel information in a compact two-row format that fits better in narrow spaces.
 */
export function drawCleanPanelTable(
  doc: PDFKit.PDFDocument,
  panelInfo: any[],
  x: number,
  y: number,
) {
  const panelSpacing = 20;
  const maxPanels = 6;
  doc
    .fontSize(10)
    .fillColor("#333")
    .font("Helvetica-Bold")
    .text("Panel Details:", x, y);
  y += 14;
  panelInfo.slice(0, maxPanels).forEach((info) => {
    const deltaValue = parseFloat(
      info.deltaTemp ?? info.Delta ?? info.delta ?? info.DELTA ?? 0,
    );
    let deltaColor = "#28a745";
    if (deltaValue > 15) {
      deltaColor = "#dc3545";
    } else if (deltaValue > 8) {
      deltaColor = "#f39c12";
    }
    const confidence = parseFloat(
      (info.confidence ??
        info.Confidence ??
        info.coordinates?.confidence ??
        info.Coordinates?.confidence ??
        info.ReasonConfidence ??
        0) as any,
    );
    let confidenceColor = "#28a745";
    if (confidence < 0.7) {
      confidenceColor = "#ffc107";
    }
    if (confidence < 0.5) {
      confidenceColor = "#dc3545";
    }
    doc
      .fontSize(9)
      .fillColor("#333")
      .font("Helvetica-Bold")
      .text(`Module #${info.panelNumber || info.PanelNumber}`, x, y);
    y += 12;
    const peakTempValue =
      info.highestTemp ?? info.HighestTemp ?? info.avgTemp ?? info.AvgTemp;
    const peakTemp = peakTempValue !== undefined ? `${peakTempValue}°C` : "N/A";
    const deltaTempValue =
      info.deltaTemp ?? info.Delta ?? info.delta ?? info.DELTA;
    const deltaTemp =
      deltaTempValue !== undefined ? `${deltaTempValue}°C` : "N/A";
    const confidenceStr = `${Math.round(confidence * 100)}%`;
    doc
      .fontSize(8)
      .fillColor("#555")
      .font("Helvetica")
      .text(`Peak: ${peakTemp}`, x, y);
    doc
      .fontSize(8)
      .fillColor("#555")
      .font("Helvetica")
      .text(`Delta: `, x + 65, y);
    doc
      .fontSize(8)
      .fillColor(deltaColor)
      .font("Helvetica-Bold")
      .text(deltaTemp, x + 95, y);
    doc
      .fontSize(8)
      .fillColor("#555")
      .font("Helvetica")
      .text(`Conf: `, x + 130, y);
    doc
      .fontSize(8)
      .fillColor(confidenceColor)
      .font("Helvetica-Bold")
      .text(confidenceStr, x + 155, y);
    const issueType =
      info.highestReason ??
      info.HighestReason ??
      info.ReasonDetected ??
      info.reasonDetected ??
      "Unknown";
    if (issueType && issueType !== "Unknown") {
      y += 10;
      let issueColor = "#333";
      const lowerIssue = issueType.toLowerCase();
      if (
        lowerIssue.includes("hotspot") ||
        lowerIssue.includes("hot-spot") ||
        lowerIssue.includes("cellhotspot")
      ) {
        issueColor = "#dc3545";
      } else if (lowerIssue.includes("cracking")) {
        issueColor = "#e67e22";
      } else if (lowerIssue.includes("vegetation")) {
        issueColor = "#27ae60";
      } else if (lowerIssue.includes("diode")) {
        issueColor = "#8e44ad";
      }
      doc.fontSize(8).fillColor("#555").font("Helvetica").text(`Issue: `, x, y);
      doc
        .fontSize(8)
        .fillColor(issueColor)
        .font("Helvetica-Bold")
        .text(
          issueType.charAt(0).toUpperCase() + issueType.slice(1),
          x + 30,
          y,
        );
    }
    y += panelSpacing;
  });
  if (panelInfo.length > maxPanels) {
    y += 3;
    doc
      .fontSize(7)
      .fillColor("#999")
      .font("Helvetica-Oblique")
      .text(`+ ${panelInfo.length - maxPanels} more panels`, x, y);
    y += 8;
  }
  return y;
}
