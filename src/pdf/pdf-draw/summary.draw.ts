// Analytics summary and map drawing logic for PDF generation
import fetch from "node-fetch";

/**
 * Draw a side-by-side section with Analytics Summary on the left and a map preview on the right.
 */
export async function drawSummaryAndMap(
  doc: PDFKit.PDFDocument,
  total: number,
  healthy: number,
  unhealthy: number,
  totalPanels: number,
  maxDelta: number,
  avgDelta: number,
  images: any[],
  options: {
    plantCapacityMW?: number;
    droneMakeModel?: string;
    totalEnergyLossKWh?: number;
    irradianceKwhPerM2PerYear?: number;
    avgLossPct?: number;
    pricePerKwh?: number;
    totalRevenueLoss?: number;
    mapboxToken: string;
    gap: number;
  },
) {
  const startX = doc.page.margins.left;
  const startY = doc.y;
  const contentWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const summaryWidth = contentWidth * 0.48;
  const mapWidth = contentWidth * 0.5;
  const rowHeight = 25;
  const mapBoxHeight = 240;

  let healthyPct = 0;
  let unhealthyPct = 0;
  if (total) {
    healthyPct = ((healthy ?? 0) / total) * 100;
    unhealthyPct = ((unhealthy ?? 0) / total) * 100;
  }

  const summaryData = [
    options.plantCapacityMW !== undefined
      ? { label: "Plant Capacity", value: `${options.plantCapacityMW} MW` }
      : null,
    { label: "Total Images", value: total ?? 0 },
    {
      label: "Healthy",
      value: `${healthy ?? 0} (${healthyPct.toFixed(1)}%)`,
      color: "#28a745",
    },
    {
      label: "Unhealthy",
      value: `${unhealthy ?? 0} (${unhealthyPct.toFixed(1)}%)`,
      color: "#dc3545",
    },
    { label: "Panels Analyzed", value: totalPanels ?? 0 },
    { label: "Max Temperature", value: `${maxDelta.toFixed(1)}°C` },
    { label: "Avg Temperature", value: `${avgDelta.toFixed(1)}°C` },
    options.droneMakeModel
      ? { label: "Drone", value: options.droneMakeModel }
      : null,
  ];

  doc.font("Helvetica").fontSize(10);
  const filteredSummary = summaryData.filter(Boolean);
  filteredSummary.forEach((row: any, index: number) => {
    doc
      .fillColor("#333")
      .text(row.label, startX + 15, startY + 45 + index * rowHeight + 8);
    doc
      .fillColor(row.color || "#333")
      .text(
        String(row.value),
        startX + summaryWidth - 100,
        startY + 45 + index * rowHeight + 8,
        { width: 100 - 15, align: "right" },
      );
  });

  const tableRowsCount = filteredSummary.length;
  const summaryBoxHeight = 45 + tableRowsCount * rowHeight + 10;
  doc.save();
  doc
    .lineWidth(2)
    .strokeColor("#cccccc")
    .roundedRect(startX, startY, summaryWidth, summaryBoxHeight, 12)
    .stroke();
  doc.restore();

  // Title for Analytics Summary
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .fillColor("#333")
    .text("Analytics Summary", startX + 15, startY + 15);

  // Estimated Annual Loss box
  const rightBoxX = startX + summaryWidth + 10;
  const rightBoxY = startY;
  const rightBoxContentY = startY + 8;
  const rightBoxWidth = mapWidth;
  const rightBoxHeight = 80;
  if (options.totalEnergyLossKWh !== undefined) {
    doc
      .lineWidth(2)
      .strokeColor("#cccccc")
      .roundedRect(
        rightBoxX + 5,
        rightBoxY,
        rightBoxWidth - 10,
        rightBoxHeight,
        12,
      )
      .stroke();
    doc.restore();
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#d9534f")
      .text("Estimated Annual Loss: ", rightBoxX + 15, rightBoxContentY + 8);
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#d9534f")
      .text(
        `${options.totalEnergyLossKWh.toFixed(1)} kWh`,
        rightBoxX + rightBoxWidth - 140,
        rightBoxContentY + 8,
        { width: 140 - 15, align: "right" },
      );

    const priceY = rightBoxContentY + 28;
    const revenueY = priceY + 12;
    if (options.pricePerKwh !== undefined) {
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#555")
        .text(`Price: ${options.pricePerKwh} € /kWh`, rightBoxX + 15, priceY, {
          width: rightBoxWidth - 2 * 15,
          align: "left",
        });
    }
    if (
      options.totalRevenueLoss !== undefined &&
      options.totalRevenueLoss > 0
    ) {
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#d9534f")
        .text(
          `Est. Revenue Loss: ${options.totalRevenueLoss.toFixed(2)} €`,
          rightBoxX + 15,
          revenueY,
          { width: rightBoxWidth - 2 * 15, align: "left" },
        );
    }
  }

  // Doughnut chart
  const doughnutChartSize = 180;
  const doughnutChartX = rightBoxX - 25;
  const doughnutChartY = rightBoxY + rightBoxHeight;
  try {
    const doughnutConfig = {
      type: "doughnut",
      data: {
        labels: ["Healthy", "Unhealthy"],
        datasets: [
          {
            data: [healthy || 0, unhealthy || 0],
            backgroundColor: ["#28a745", "#dc3545"],
            borderColor: "#ffffff",
            borderWidth: 2,
            borderRadius: 20,
          },
        ],
      },
      options: {
        cutout: "60%",
        plugins: {
          legend: {
            display: true,
            position: "right",
            align: "start",
            labels: {
              boxWidth: 24,
              padding: 16,
              font: { size: 16 },
              color: "#555",
              usePointStyle: true,
            },
          },
          tooltip: { enabled: false },
          datalabels: {
            display: true,
            color: "#ffffff",
            font: { weight: "bold", size: 22 },
            formatter: (value: number) =>
              value > 0 ? `${((value / total) * 100).toFixed(0)}%` : "",
          },
          doughnutlabel: {
            labels: [
              {
                text: total.toString(),
                font: { size: 44, weight: "bold", family: "Helvetica" },
              },
              {
                text: "Total Images",
                font: { size: 18, family: "Helvetica" },
              },
            ],
          },
        },
        layout: {
          padding: 0,
        },
      },
    };
    const chartImageWidth = doughnutChartSize + 140;
    const chartImageHeight = doughnutChartSize;
    const doughnutUrl = `https://quickchart.io/chart?width=${chartImageWidth}&height=${chartImageHeight}&c=${encodeURIComponent(
      JSON.stringify(doughnutConfig),
    )}`;
    const doughnutRes = await fetch(doughnutUrl);
    if (doughnutRes.ok) {
      const doughnutBuf = await doughnutRes.buffer();
      doc.image(doughnutBuf, doughnutChartX, doughnutChartY, {
        width: chartImageWidth,
        height: chartImageHeight,
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Doughnut chart load error", err);
  }

  // Map below the summary table
  const mapY = startY + summaryBoxHeight + 35;
  let mapImage: Buffer | null = null;
  if (images.length > 0) {
    const pins = images
      .map((img) => `pin-l+ff0000(${img.longitude},${img.latitude})`)
      .join(",");
    const center = `${images[0].longitude},${images[0].latitude}`;
    const mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${pins}/${center},16/600x300@2x?access_token=${options.mapboxToken}`;
    try {
      const res = await fetch(mapboxUrl);
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType?.startsWith("image/")) {
        mapImage = await res.buffer();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to load global map:", err);
    }
  }
  if (mapImage) {
    const mapboxAspectRatio = 2;
    const mapDisplayWidth = contentWidth;
    const mapDisplayHeight = mapDisplayWidth / mapboxAspectRatio;
    doc.save();
    doc.roundedRect(startX, mapY, mapDisplayWidth, mapDisplayHeight, 8).clip();
    doc.image(mapImage, startX, mapY, {
      width: mapDisplayWidth,
      height: mapDisplayHeight,
    });
    doc.restore();
  } else {
    doc
      .fontSize(10)
      .fillColor("gray")
      .text(
        "Map preview unavailable.",
        startX + 10,
        mapY + mapBoxHeight / 2 - 5,
        {
          width: contentWidth - 20,
        },
      );
  }

  // Move the Y position below the summary and map section
  doc.y = mapY + contentWidth / 2 + options.gap;
}
