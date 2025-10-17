import { Test, TestingModule } from "@nestjs/testing";
import { InternalJobMonitoringService } from "./internal-job-monitoring.service";
import { PrismaService } from "../prisma.service";
import { MailService } from "../helpers/mail-helper";

describe("InternalJobMonitoringService", () => {
  let service: InternalJobMonitoringService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalJobMonitoringService,
        {
          provide: PrismaService,
          useValue: {
            drospectInspection: {
              findMany: jest.fn(),
              updateMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: MailService,
          useValue: {
            sendInternalAlert: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InternalJobMonitoringService>(
      InternalJobMonitoringService,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should get system metrics", async () => {
    const mockCounts = [2, 1, 5, 0]; // pending, running, completed, failed
    jest
      .spyOn(prismaService.drospectInspection, "count")
      .mockResolvedValueOnce(mockCounts[0]) // pending
      .mockResolvedValueOnce(mockCounts[1]) // running
      .mockResolvedValueOnce(mockCounts[2]) // completed
      .mockResolvedValueOnce(mockCounts[3]); // failed

    const metrics = await (service as any).getSystemMetrics();

    expect(metrics).toEqual({
      pending: 2,
      running: 1,
      completed: 5,
      failed: 0,
      total: 8,
    });
  });

  it("should calculate job duration correctly", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const duration = (service as any).getJobDuration(oneHourAgo);
    expect(duration).toBe("1h 0m");
  });
});
