import { Injectable } from "@nestjs/common";
import { ImageService } from "src/images/image.service";
import { ProjectService } from "src/project/project.service";
import fetch from "node-fetch";
import * as PDFDocument from "pdfkit";
import { AppLogger } from "../common/logger/logger.service";
import { Storage } from "@google-cloud/storage";
import {
  NasaIrradianceService,
  ReverseGeocodeService,
  REGIONAL_PRICES_EUR,
  calculateEnergyLoss,
} from "../energy";
import { drawPanelSection } from "./pdf-draw/panel-section.draw";
import { drawSummaryAndMap } from "./pdf-draw/summary.draw";
import { drawCleanPanelTable } from "./pdf-draw/tables.draw";
import { drawDetectionRectangles } from "./pdf-draw/detection.draw";
import { drawFooter } from "./pdf-draw/footer.draw";
//
/////
////
// NOTE TO SELF :
//// Save the variables as env in prod/dev
//// Optimize Code
//
@Injectable()
export class PdfService {
  private readonly logger = new AppLogger();

  constructor(
    private readonly imageService: ImageService,
    private readonly projectService: ProjectService,
    private readonly nasaIrradianceService: NasaIrradianceService, // Inject NASA service
    private readonly reverseGeocodeService: ReverseGeocodeService, // Inject reverse geocode service
  ) {}

  private readonly HEADER_HEIGHT = 88; // Reverted to original height
  private readonly LOGO_WIDTH = 120; // Increased logo size
  private readonly LOGO_HEIGHT = 30;
  private readonly IMAGE_HEIGHT = 140;
  private readonly GAP = 10; // Reduced gap for better spacing between sections (was 25)
  // MAPBOX_TOKEN moved to environment variable
  private readonly MAPBOX_TOKEN = process.env.MAPBOX_TOKEN!;
  // Performance optimization: limit concurrent requests to avoid overwhelming external APIs
  private readonly MAX_CONCURRENT_REQUESTS = 10;

  /**
   * Draw an orange frame that starts at a custom Y and wraps the content area.
   */
  private drawPageFrame(
    doc: PDFKit.PDFDocument,
    margin: number,
    frameY: number,
    frameHeight: number,
  ) {
    const frameX = margin;
    const frameWidth = doc.page.width - 2 * margin;
    const strokeWidth = 2;

    doc.save();

    // Draw a white background (optional, can be removed if not needed)
    doc
      .roundedRect(frameX, frameY, frameWidth, frameHeight, 12)
      .fillColor("white")
      .fill();

    // Draw a solid grey border
    doc
      .lineWidth(strokeWidth)
      .strokeColor("#cccccc")
      .roundedRect(frameX, frameY, frameWidth, frameHeight, 12)
      .stroke();

    doc.restore();
  }

  /**
   * Draw a rectangle with a linear gradient and rounded corners.
   */
  private drawGradientRoundedRect(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    startColor: string,
    endColor: string,
  ) {
    doc.save();
    const gradient = doc.linearGradient(x, y, x + width, y);
    gradient.stop(0, startColor).stop(1, endColor);
    doc.roundedRect(x, y, width, height, radius).fill(gradient);
    doc.restore();
  }

  /**
   * Draw the header for content pages.
   */
  private async drawHeader(
    doc: PDFKit.PDFDocument,
    projectId: number,
    projectName: string,
    logo: Buffer, // <-- add logo buffer
    latitude?: number,
    longitude?: number,
    mapLinkY?: number,
    mapLinkWidth?: number,
  ) {
    const pageWidth = doc.page.width;
    const headerMargin = 20;
    const headerX = headerMargin;
    const headerY = headerMargin;
    const headerWidth = pageWidth - 2 * headerMargin;
    const headerHeight = this.HEADER_HEIGHT;
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
    const logoWidth = this.LOGO_WIDTH;
    const logoHeight = this.LOGO_HEIGHT;
    const logoX = headerX + headerWidth - logoWidth - 20; // Padding from right
    const logoY = headerY + (headerHeight - logoHeight) / 2; // Vertically centered
    doc.image(logo, logoX, logoY, {
      width: logoWidth,
      height: logoHeight,
    });

    // Draw the Google Maps link centered below the map image if Y/width provided
    if (
      latitude !== undefined &&
      longitude !== undefined &&
      mapLinkY !== undefined &&
      mapLinkWidth !== undefined
    ) {
      const linkText = "View on Google Maps";
      const linkFontSize = 12;
      doc.fontSize(linkFontSize).fillColor("#007BFF").font("Helvetica-Bold");
      const textWidth = doc.widthOfString(linkText);
      const textHeight = doc.currentLineHeight();
      const linkX = doc.page.margins.left + (mapLinkWidth - textWidth) / 2;
      doc.text(linkText, linkX, mapLinkY, { underline: true });
      const globalMapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      doc.link(linkX, mapLinkY, textWidth, textHeight, globalMapLink);
    }
    doc.y = headerY + headerHeight + this.GAP;
  }

  /**
   * Extract a shorter, cleaner image name from the full filename
   */
  private formatImageName(fullName: string): string {
    if (!fullName) return "Unnamed";

    // Extract pattern like DJI_YYYYMMDDHHMMSS_XXXX_T.JPG to DJI_XXXX_T.JPG
    const match = fullName.match(/DJI_\d{14}_(\d{4}_[A-Z]\.JPG)/i);
    if (match) {
      return `DJI_${match[1]}`;
    }

    // If pattern doesn't match, just return the filename without path
    return fullName.split("/").pop() || fullName;
  }

  /**
   * Helper to estimate the height needed for a panel section, including variable panel info.
   */
  private estimatePanelSectionHeight(image: any): number {
    // Base height for image and map
    let height = this.IMAGE_HEIGHT + 20; // Further reduced padding (was 30)
    // Estimate panel info height
    const panelInfo = Array.isArray(image.panelInformation)
      ? image.panelInformation
      : [];
    const panelSpacing = 15; // Further reduced spacing (was 20)
    const maxPanels = 6;
    const panelInfoRows = Math.min(panelInfo.length, maxPanels);
    // Each panel: 12 (title) + 12 (data) + (optional) 8 (issue) + spacing
    let panelInfoHeight = 0;
    for (let i = 0; i < panelInfoRows; i++) {
      panelInfoHeight += 12 + 12 + panelSpacing; // title + data + spacing (reduced from 14+14)
      // If issue type exists, add extra height
      const info = panelInfo[i];
      const issueType =
        info.highestReason ||
        info.HighestReason ||
        info.ReasonDetected ||
        info.reasonDetected;
      if (issueType && issueType !== "Unknown") {
        panelInfoHeight += 8; // Further reduced from 10
      }
    }
    // If more panels, add extra line
    if (panelInfo.length > maxPanels) {
      panelInfoHeight += 8; // Further reduced from 10
    }
    // Add some padding
    height += panelInfoHeight + 20; // Further reduced padding (was 30)

    // Apply a safety factor to be more aggressive about fitting 2 images per page
    height = Math.min(height, 400); // Cap the estimated height at 400px to ensure 2+ images per page

    return height;
  }

  /**
   * Main method to generate the PDF document with unhealthy images.
   */
  async generateUnhealthyImagesPdf(
    projectId: number,
    imageIds?: number[],
  ): Promise<Buffer> {
    const startTime = Date.now();
    this.logger.info(`Starting PDF generation for project ${projectId}`, {
      projectId,
    });

    const pdfBuffer: Buffer[] = [];
    const doc = new (PDFDocument as any)({ size: "A4", margin: 30 });
    doc.on("data", (chunk: Buffer) => pdfBuffer.push(chunk));

    // Fetch logo once
    const logoUrl =
      "https://storage.googleapis.com/solar-panel-detection-1.appspot.com/drospect_logo/Group%20110.png";
    const logo = await fetch(logoUrl).then((res) => res.buffer());

    // Fetch images: either by provided IDs (from FE filters) or default to all unhealthy
    const unhealthyImages =
      imageIds && imageIds.length > 0
        ? await (async () => {
            const images = await this.imageService.getImagesByIds(imageIds);
            // Ensure only images from this project are included
            return images.filter((img: any) => img.projectId === projectId);
          })()
        : await this.imageService.getUnhealthyImagesByProjectId(projectId);
    this.logger.info(`Found ${unhealthyImages.length} unhealthy images`, {
      projectId,
      imageCount: unhealthyImages.length,
    });

    const project = await this.projectService.getProjectById(projectId);
    const projectName = project?.project.name;

    let latitude: number | undefined;
    let longitude: number | undefined;
    if (unhealthyImages.length > 0) {
      latitude = unhealthyImages[0].latitude;
      longitude = unhealthyImages[0].longitude;
    }

    // Calculate map link Y/width for the header link
    const pageWidth = 595.28; // A4 width in pt (portrait, PDFKit default)
    const margin = 30; // PDFKit default margin
    const contentWidth = pageWidth - 2 * margin;
    const summaryBoxHeight = 45 + 8 * 25 + 10; // Approximate, or recalc if needed
    const mapY = margin + 88 + 10 + summaryBoxHeight + 35; // headerMargin + HEADER_HEIGHT + GAP + summaryBoxHeight + 35
    const mapboxAspectRatio = 2;
    const mapDisplayWidth = contentWidth;
    const mapDisplayHeight = mapDisplayWidth / mapboxAspectRatio;
    const linkY = mapY + mapDisplayHeight + 12;

    // Draw header (now passes lat/lng and link position)
    await this.drawHeader(
      doc,
      projectId,
      projectName,
      logo, // pass logo buffer
      latitude,
      longitude,
      linkY,
      mapDisplayWidth,
    );

    // --- New: Collect all panel defects for energy loss calculation ---
    const panelDefects: any[] = [];
    for (const image of unhealthyImages) {
      if (Array.isArray(image.panelInformation)) {
        for (const panel of image.panelInformation) {
          let defectType = "Unhealthy";
          if (typeof panel === "object" && panel !== null) {
            if (
              "reasonDetected" in panel &&
              typeof panel["reasonDetected"] === "string" &&
              panel["reasonDetected"]
            ) {
              defectType = panel["reasonDetected"];
            } else if (
              "highestReason" in panel &&
              typeof panel["highestReason"] === "string" &&
              panel["highestReason"]
            ) {
              defectType = panel["highestReason"];
            }
          }
          const count = 1;
          const capacityW = 550;
          panelDefects.push({
            defectType,
            count,
            capacityW,
          });
        }
      }
    }

    // --- Calculate per-defect and total energy loss ---
    let irradianceKwhPerM2PerYear: number | undefined;
    let pricePerKwh: number | undefined;
    let region: string | undefined;
    let totalEnergyLossKWh = 0;
    let totalRevenueLoss = 0;
    let avgLossPct = 0.2; // fallback default

    // Parallel external API calls
    const [irradianceResult, geocodeResult] = await Promise.allSettled([
      latitude !== undefined && longitude !== undefined
        ? this.nasaIrradianceService.getAnnualIrradiance(latitude, longitude)
        : Promise.resolve(undefined),
      latitude !== undefined && longitude !== undefined
        ? this.reverseGeocodeService.getCountryAndContinent(latitude, longitude)
        : Promise.resolve(undefined),
    ]);

    if (irradianceResult.status === "fulfilled") {
      irradianceKwhPerM2PerYear = irradianceResult.value;
    } else {
      this.logger.error(
        "NASA irradiance fetch failed",
        new Error(irradianceResult.reason),
        { projectId },
      );
    }

    if (geocodeResult.status === "fulfilled") {
      const { continent } = geocodeResult.value;
      region = continent;
      pricePerKwh =
        (region && (REGIONAL_PRICES_EUR as any)[region]) ?? undefined;
    } else {
      this.logger.error(
        "Reverse geocode for region failed",
        new Error(geocodeResult.reason),
        { projectId },
      );
    }

    if (irradianceKwhPerM2PerYear) {
      const energyLossResults = calculateEnergyLoss(
        panelDefects,
        irradianceKwhPerM2PerYear,
        pricePerKwh,
      );
      totalEnergyLossKWh = energyLossResults.reduce(
        (sum, r) => sum + r.energyLossKWh,
        0,
      );
      totalRevenueLoss = energyLossResults.reduce(
        (sum, r) => sum + (r.revenueLossEur || 0),
        0,
      );
      avgLossPct =
        energyLossResults.length > 0 ? energyLossResults[0].outputLoss : 0.2;
    }

    // Draw the summary/analytics section on the first page (before any addPage)
    await drawSummaryAndMap(
      doc,
      project?.panelStatistics.totalImages ?? 0,
      project?.panelStatistics.healthyPanels ?? 0,
      unhealthyImages.length,
      unhealthyImages.reduce(
        (sum, img) =>
          sum +
          (Array.isArray(img.panelInformation)
            ? img.panelInformation.length
            : 0),
        0,
      ),
      Math.max(
        ...unhealthyImages.flatMap((img) =>
          Array.isArray(img.panelInformation)
            ? img.panelInformation
                .map((panel: any) => parseFloat(panel.Delta))
                .filter((d: number) => !isNaN(d))
            : [],
        ),
        0,
      ),
      (() => {
        const deltas = unhealthyImages.flatMap((img) =>
          Array.isArray(img.panelInformation)
            ? img.panelInformation
                .map((panel: any) => parseFloat(panel.Delta))
                .filter((d: number) => !isNaN(d))
            : [],
        );
        return deltas.length
          ? deltas.reduce((a, b) => a + b, 0) / deltas.length
          : 0;
      })(),
      unhealthyImages,
      {
        plantCapacityMW: project?.project.megawatt,
        droneMakeModel: project?.project.drone?.make
          ? `${project.project.drone.make} ${
              project.project.drone.model ?? ""
            }`.trim()
          : undefined,
        totalEnergyLossKWh,
        irradianceKwhPerM2PerYear,
        avgLossPct,
        pricePerKwh,
        totalRevenueLoss,
        mapboxToken: this.MAPBOX_TOKEN,
        gap: this.GAP,
      },
    );

    /* ---------- Start images on a new page ---------- */
    doc.addPage();
    // Draw the frame on the new page as well
    {
      const headerMargin = 20;
      // Start frame at the top margin (no header)
      const frameY = headerMargin;
      const frameHeight = doc.page.height - frameY - doc.page.margins.bottom;
      this.drawPageFrame(doc, headerMargin, frameY, frameHeight);
    }
    // Draw footer with logo on the new page (all except first page)
    drawFooter(doc, logo, true, {
      logoWidth: this.LOGO_WIDTH,
      logoHeight: this.LOGO_HEIGHT,
    });

    // Pre-fetch all images and maps in parallel with concurrency limit
    this.logger.info(
      `Pre-fetching ${unhealthyImages.length} images and maps with max ${this.MAX_CONCURRENT_REQUESTS} concurrent requests`,
      {
        projectId,
        imageCount: unhealthyImages.length,
        maxConcurrent: this.MAX_CONCURRENT_REQUESTS,
      },
    );
    const fetchStartTime = Date.now();

    // Helper function to process in batches
    const processBatch = async (batch: any[]) => {
      const promises = batch.map(async (image) => {
        const [imageBuffer, mapBuffer] = await Promise.allSettled([
          fetch(image.image).then((res) => res.buffer()),
          (async () => {
            try {
              const mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/pin-l+ff0000(${image.longitude},${image.latitude})/${image.longitude},${image.latitude},15/300x150@2x?access_token=${this.MAPBOX_TOKEN}`;
              const res = await fetch(mapboxUrl);
              const contentType = res.headers.get("content-type");
              if (!res.ok || !contentType?.startsWith("image/")) {
                throw new Error("Map fetch failed");
              }
              return await res.buffer();
            } catch (error) {
              console.error(
                `Failed to fetch map for image ${image.imageName}:`,
                error,
              );
              return null;
            }
          })(),
        ]);

        return {
          image,
          imageBuffer:
            imageBuffer.status === "fulfilled" ? imageBuffer.value : null,
          mapBuffer: mapBuffer.status === "fulfilled" ? mapBuffer.value : null,
          imageError:
            imageBuffer.status === "rejected" ? imageBuffer.reason : null,
        };
      });

      return Promise.all(promises);
    };

    // Process in batches to limit concurrency
    const imageAndMapResults: any[] = [];
    for (
      let i = 0;
      i < unhealthyImages.length;
      i += this.MAX_CONCURRENT_REQUESTS
    ) {
      const batch = unhealthyImages.slice(i, i + this.MAX_CONCURRENT_REQUESTS);
      const batchResults = await processBatch(batch);
      imageAndMapResults.push(...batchResults);
      this.logger.debug(
        `Processed batch ${
          Math.floor(i / this.MAX_CONCURRENT_REQUESTS) + 1
        }/${Math.ceil(unhealthyImages.length / this.MAX_CONCURRENT_REQUESTS)}`,
        {
          projectId,
          batchNumber: Math.floor(i / this.MAX_CONCURRENT_REQUESTS) + 1,
        },
      );
    }

    const fetchEndTime = Date.now();
    this.logger.info(
      `Pre-fetching completed in ${fetchEndTime - fetchStartTime}ms`,
      {
        projectId,
        duration: fetchEndTime - fetchStartTime,
      },
    );

    // Draw each individual image panel section
    for (const result of imageAndMapResults) {
      const { image, imageBuffer, mapBuffer, imageError } = result;

      if (imageError) {
        this.logger.error(
          `Error loading image: ${image.image}`,
          new Error(imageError.message),
          { projectId, imageId: image.id },
        );
        continue;
      }

      // Dynamically estimate section height
      const sectionHeight = this.estimatePanelSectionHeight(image);
      const availableHeight = doc.page.height - doc.y - doc.page.margins.bottom;

      // Add new page if the section won't fit on the current one
      if (sectionHeight > availableHeight) {
        doc.addPage();
        // Draw the frame on every new page
        const headerMargin = 20;
        const frameY = headerMargin;
        const frameHeight = doc.page.height - frameY - doc.page.margins.bottom;
        this.drawPageFrame(doc, headerMargin, frameY, frameHeight);
        // Draw footer with logo on every new page (all except first page)
        drawFooter(doc, logo, true, {
          logoWidth: this.LOGO_WIDTH,
          logoHeight: this.LOGO_HEIGHT,
        });
      }

      // Draw the full section for an individual image including its image, map preview, and panel info.
      await drawPanelSection(doc, image, imageBuffer, {
        imageHeight: this.IMAGE_HEIGHT,
        gap: this.GAP,
        mapboxToken: this.MAPBOX_TOKEN,
        drawDetectionRectangles,
        drawCleanPanelTable,
        preFetchedMapBuffer: mapBuffer, // Pass pre-fetched map buffer
      });
    }

    // Optionally add footer on each page (if multi-page, you might iterate over pages)
    // Do not draw footer on the first page; already handled for all other pages

    doc.end();

    const endTime = Date.now();
    this.logger.info(`PDF generation completed in ${endTime - startTime}ms`, {
      projectId,
      duration: endTime - startTime,
    });

    return new Promise((resolve) => {
      doc.on("end", () =>
        resolve(Buffer.concat(pdfBuffer as unknown as Uint8Array[])),
      );
    });
  }

  /**
   * Generate PDF and upload to GCS, returning a shareable public URL
   */
  async sharePdfReport(projectId: number): Promise<string> {
    const startTime = Date.now();
    this.logger.info(`Starting PDF share for project ${projectId}`, {
      projectId,
    });

    try {
      // Generate the PDF buffer
      const pdfBuffer = await this.generateUnhealthyImagesPdf(projectId);

      // Get project name for filename
      let projectName = "Project";
      try {
        const { project } = await this.projectService.getProjectById(projectId);
        if (project?.name) {
          projectName = project.name;
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch project name for ${projectId}`, {
          err,
        });
      }

      // Sanitize filename
      const sanitized = projectName.replace(/[\\/:*?"<>|]/g, "").trim();
      const fileName = `shared-reports/${sanitized}-${projectId}-${Date.now()}.pdf`;

      // Initialize Google Cloud Storage
      const storage = new Storage({
        projectId: process.env.GCLOUD_PROJECT_ID,
        keyFilename: process.env.GCS_KEYFILE_PATH,
      });

      const bucketName = process.env.GCS_BUCKET_NAME;
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(fileName);

      // Upload the PDF to GCS
      await file.save(pdfBuffer, {
        metadata: {
          contentType: "application/pdf",
          cacheControl: "public, max-age=3600",
        },
      });

      // Make the file publicly accessible
      await file.makePublic();

      // Generate the public URL
      const shareUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

      const endTime = Date.now();
      this.logger.info(`PDF share completed in ${endTime - startTime}ms`, {
        projectId,
        shareUrl,
        duration: endTime - startTime,
      });

      return shareUrl;
    } catch (error) {
      this.logger.error(
        `Failed to share PDF for project ${projectId}`,
        error instanceof Error ? error : undefined,
        { projectId },
      );
      throw error;
    }
  }

  /**
   * Upload an existing PDF blob to GCS and return a shareable public URL
   */
  async sharePdfBlob(file: any): Promise<string> {
    const startTime = Date.now();
    this.logger.info(`Starting PDF blob share`, {
      filename: file.originalname,
      size: file.size,
    });

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const sanitized = file.originalname.replace(/[\\/:*?"<>|]/g, "").trim();
      const fileName = `shared-reports/${sanitized}-${timestamp}.pdf`;

      // Initialize Google Cloud Storage
      const storage = new Storage({
        projectId: process.env.GCLOUD_PROJECT_ID,
        keyFilename: process.env.GCS_KEYFILE_PATH,
      });

      const bucketName = process.env.GCS_BUCKET_NAME;
      const bucket = storage.bucket(bucketName);
      const gcsFile = bucket.file(fileName);

      // Upload the PDF to GCS
      await gcsFile.save(file.buffer, {
        metadata: {
          contentType: "application/pdf",
          cacheControl: "public, max-age=3600",
        },
      });

      // Make the file publicly accessible
      await gcsFile.makePublic();

      // Generate the public URL
      const shareUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

      const endTime = Date.now();
      this.logger.info(`PDF blob share completed in ${endTime - startTime}ms`, {
        shareUrl,
        duration: endTime - startTime,
      });

      return shareUrl;
    } catch (error) {
      this.logger.error(
        `Failed to share PDF blob`,
        error instanceof Error ? error : undefined,
        { filename: file.originalname },
      );
      throw error;
    }
  }
}
