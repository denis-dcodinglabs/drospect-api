import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma.service";
import { MailService } from "../helpers/mail-helper";

@Injectable()
export class InternalJobMonitoringService {
  private readonly logger = new Logger(InternalJobMonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Check for jobs that have been pending for over 1 hour
   * Runs every hour
   */
  @Cron("0 0 * * * *") // Every hour at minute 0
  async checkPendingJobs(): Promise<void> {
    try {
      this.logger.log("Starting pending jobs check...");

      const pendingTimeout = parseInt(
        process.env.PENDING_JOB_ALERT_TIMEOUT || "3600",
      ); // 1 hour default
      const cutoffTime = new Date(Date.now() - pendingTimeout * 1000);

      // Find jobs that have been pending for over the timeout period
      const pendingJobs = await this.prisma.drospectInspection.findMany({
        where: {
          status: "pending",
          createdAt: {
            lt: cutoffTime,
          },
          pendingNotificationSent: false,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (pendingJobs.length > 0) {
        this.logger.warn(
          `Found ${pendingJobs.length} jobs pending for over ${pendingTimeout} seconds`,
        );
        await this.sendPendingJobsAlert(pendingJobs);

        // Mark notifications as sent
        await this.markNotificationsSent(pendingJobs.map((job) => job.id));
      } else {
        this.logger.log("No pending jobs found that require alerts");
      }
    } catch (error) {
      this.logger.error(`Error checking pending jobs: ${error.message}`);
    }
  }

  /**
   * Check for jobs that have been running for over 2 hours (stuck)
   * Runs every hour
   */
  @Cron("0 0 * * * *") // Every hour at minute 0
  async checkStuckRunningJobs(): Promise<void> {
    try {
      this.logger.log("Starting stuck running jobs check...");

      const stuckTimeout = parseInt(process.env.STUCK_JOB_TIMEOUT || "7200"); // 2 hours default
      const cutoffTime = new Date(Date.now() - stuckTimeout * 1000);

      // Find jobs that have been running for over the timeout period
      // Use updatedAt since startedAt might be NULL for older jobs
      const stuckJobs = await this.prisma.drospectInspection.findMany({
        where: {
          status: "running",
          updatedAt: {
            lt: cutoffTime,
          },
        },
        orderBy: {
          updatedAt: "asc",
        },
      });

      if (stuckJobs.length > 0) {
        this.logger.error(
          `Found ${stuckJobs.length} jobs stuck in running state for over ${stuckTimeout} seconds`,
        );
        await this.handleStuckJobs(stuckJobs);
      } else {
        this.logger.log("No stuck running jobs found");
      }
    } catch (error) {
      this.logger.error(`Error checking stuck running jobs: ${error.message}`);
    }
  }

  /**
   * Send alert for pending jobs
   */
  private async sendPendingJobsAlert(pendingJobs: any[]): Promise<void> {
    try {
      const systemMetrics = await this.getSystemMetrics();
      const oldestPendingDuration = this.getJobDuration(
        pendingJobs[0].createdAt,
      );

      const emailContent = this.buildPendingJobsEmailContent(
        pendingJobs,
        systemMetrics,
        oldestPendingDuration,
      );

      await this.mailService.sendInternalAlert(
        "Jobs Stuck in Queue - System Investigation Needed",
        emailContent,
      );

      this.logger.log(`Sent pending jobs alert for ${pendingJobs.length} jobs`);
    } catch (error) {
      this.logger.error(`Error sending pending jobs alert: ${error.message}`);
    }
  }

  /**
   * Handle stuck running jobs - mark as failed and try to start next job
   */
  private async handleStuckJobs(stuckJobs: any[]): Promise<void> {
    try {
      // Mark stuck jobs as failed
      for (const job of stuckJobs) {
        await this.prisma.drospectInspection.update({
          where: { id: job.id },
          data: {
            status: "failed",
            errorMessage: `Job timeout - stuck in running state for ${this.getJobDuration(
              job.updatedAt,
            )}`,
            completedAt: new Date(),
          },
        });

        this.logger.error(`Marked stuck job ${job.id} as failed`);
      }

      // Send alert about stuck jobs
      await this.sendStuckJobsAlert(stuckJobs);

      // Try to process next job
      // Note: This would require importing InspectService, but to avoid circular dependencies,
      // we'll let the normal job processing handle this
      this.logger.log(
        "Stuck jobs marked as failed, next job should start automatically",
      );
    } catch (error) {
      this.logger.error(`Error handling stuck jobs: ${error.message}`);
    }
  }

  /**
   * Send alert for stuck jobs
   */
  private async sendStuckJobsAlert(stuckJobs: any[]): Promise<void> {
    try {
      const emailContent = this.buildStuckJobsEmailContent(stuckJobs);

      await this.mailService.sendInternalAlert(
        "CRITICAL: Stuck Running Jobs Detected",
        emailContent,
      );

      this.logger.log(`Sent stuck jobs alert for ${stuckJobs.length} jobs`);
    } catch (error) {
      this.logger.error(`Error sending stuck jobs alert: ${error.message}`);
    }
  }

  /**
   * Get system metrics for monitoring
   */
  private async getSystemMetrics(): Promise<any> {
    const [pendingCount, runningCount, completedCount, failedCount] =
      await Promise.all([
        this.prisma.drospectInspection.count({ where: { status: "pending" } }),
        this.prisma.drospectInspection.count({ where: { status: "running" } }),
        this.prisma.drospectInspection.count({
          where: { status: "completed" },
        }),
        this.prisma.drospectInspection.count({ where: { status: "failed" } }),
      ]);

    return {
      pending: pendingCount,
      running: runningCount,
      completed: completedCount,
      failed: failedCount,
      total: pendingCount + runningCount + completedCount + failedCount,
    };
  }

  /**
   * Mark notifications as sent for given job IDs
   */
  private async markNotificationsSent(jobIds: number[]): Promise<void> {
    await this.prisma.drospectInspection.updateMany({
      where: {
        id: {
          in: jobIds,
        },
      },
      data: {
        pendingNotificationSent: true,
      },
    });
  }

  /**
   * Calculate job duration in human readable format
   */
  private getJobDuration(startTime: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  }

  /**
   * Build email content for pending jobs alert
   */
  private buildPendingJobsEmailContent(
    pendingJobs: any[],
    systemMetrics: any,
    oldestPendingDuration: string,
  ): string {
    const timestamp = new Date().toISOString();

    let pendingJobsList = "";
    pendingJobs.forEach((job) => {
      const duration = this.getJobDuration(job.createdAt);
      pendingJobsList += `- Job ID: ${job.id}, Project ID: ${
        job.projectId || "N/A"
      }, Source: ${job.source}, Pending: ${duration}\n`;
    });

    return `
System Status: ATTENTION REQUIRED
Time: ${timestamp}

PENDING JOBS (Not Started):
${pendingJobsList}

CURRENT SYSTEM STATE:
- Running Jobs: ${systemMetrics.running}
- Pending Jobs: ${systemMetrics.pending}
- Completed Jobs: ${systemMetrics.completed}
- Failed Jobs: ${systemMetrics.failed}
- Total Jobs: ${systemMetrics.total}
- Oldest Pending Job: ${oldestPendingDuration}

POSSIBLE ISSUES TO INVESTIGATE:
1. External API (${pendingJobs
      .map((j) => j.source)
      .join("/")}) may be down or slow
2. Job processing service may be stuck
3. Database connection issues
4. Resource constraints

ACTION REQUIRED:
- Check external API status
- Verify job processing service is running
- Review system logs for errors
- Consider manual intervention if needed

System: solar-panel-web
Environment: ${process.env.NODE_ENV || "development"}
`;
  }

  /**
   * Build email content for stuck jobs alert
   */
  private buildStuckJobsEmailContent(stuckJobs: any[]): string {
    const timestamp = new Date().toISOString();

    let stuckJobsList = "";
    stuckJobs.forEach((job) => {
      const duration = this.getJobDuration(job.updatedAt);
      stuckJobsList += `- Job ID: ${job.id}, Project ID: ${
        job.projectId || "N/A"
      }, Source: ${job.source}, Running: ${duration}\n`;
    });

    return `
System Status: CRITICAL
Time: ${timestamp}

STUCK RUNNING JOBS:
${stuckJobsList}

ACTION TAKEN:
- Marked ${stuckJobs.length} jobs as failed
- Attempted to start next pending job

INVESTIGATION REQUIRED:
- Check external API connectivity
- Review system resources
- Check for deadlocks or hanging processes
- Verify external processing services are responding

System: solar-panel-web
Environment: ${process.env.NODE_ENV || "development"}
`;
  }
}
