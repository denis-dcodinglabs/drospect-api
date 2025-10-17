// Shared types/interfaces for PDF generation

export interface PdfPanelInfo {
  PanelNumber?: number;
  panelNumber?: number;
  Delta?: number | string;
  deltaTemp?: number | string;
  delta?: number | string;
  DELTA?: number | string;
  highestTemp?: number;
  HighestTemp?: number;
  avgTemp?: number;
  AvgTemp?: number;
  confidence?: number;
  Confidence?: number;
  ReasonConfidence?: number;
  coordinates?: any;
  Coordinates?: any;
  highestReason?: string;
  HighestReason?: string;
  ReasonDetected?: string;
  reasonDetected?: string;
  [key: string]: any;
}

export interface PdfImageInfo {
  imageName: string;
  image: string; // URL or path
  latitude: number;
  longitude: number;
  panelInformation: PdfPanelInfo[];
  highestReason?: string;
  reasonDetected?: string;
  ReasonDetected?: string;
  [key: string]: any;
}

export interface PdfAnalyticsSummary {
  total: number;
  healthy: number;
  unhealthy: number;
  totalPanels: number;
  maxDelta: number;
  avgDelta: number;
  plantCapacityMW?: number;
  droneMakeModel?: string;
  totalEnergyLossKWh?: number;
  irradianceKwhPerM2PerYear?: number;
  avgLossPct?: number;
  pricePerKwh?: number;
  totalRevenueLoss?: number;
}
