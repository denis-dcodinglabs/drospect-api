import { Json } from "exiftool-vendored";

export interface PanelStatisticsSummary {
  totalImages: number;
  healthyPanels: number;
  unhealthyPanels: number;
  inspectedPanels: number;
  processing: number;
}

export class ProjectDto {
  id: number;
  name: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  megawatt: number;
  isactive: boolean;
  imagecounter: number;
  allrgb: boolean;
  createdat: Date;
  updatedat: Date;
  isinspected: boolean;
  hasOrthomosaic?: boolean;
  drone?: Json;
  panelStatistics?: PanelStatisticsSummary;
  user: {
    connect: {
      id: string;
    };
  };
}
