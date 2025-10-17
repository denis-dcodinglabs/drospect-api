import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD, // Use the app-specific password here
      },
    });
  }

  private shouldSkipEmails(): boolean {
    return process.env.SKIP_EMAILS === "true";
  }

  async sendClientMail(
    username: string,
    email: string,
    subject: string,
    message: string,
  ) {
    if (this.shouldSkipEmails()) {
      console.log(
        `[MAIL SKIP] Client mail would be sent to: ${process.env.DESTINATION_EMAIL} from: ${username} <${email}>, subject: Dashboard : ${subject}`,
      );
      return {
        message: "Email skipped due to SKIP_EMAILS environment variable",
      };
    }

    const mailOptions = {
      from: `"${username}" <${process.env.EMAIL}>`,
      to: process.env.DESTINATION_EMAIL,
      subject: `Dashboard : ${subject}`,
      text: `From: ${username} <${email}>\nMessage: ${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <p><strong>From:</strong> ${username} &lt;${email}&gt;</p>
          <p style="font-size: 16px; line-height: 1.5; padding: 10px; background-color: #f9f9f9; border-radius: 8px;">
            ${message}
          </p>
        </div>
      `,
    };
    return this.transporter.sendMail(mailOptions);
  }

  async sendMail(name: string, email: string, message: string) {
    if (this.shouldSkipEmails()) {
      console.log(
        `[MAIL SKIP] Contact form mail would be sent to: ${process.env.DESTINATION_EMAIL} from: ${name} <${email}>`,
      );
      return {
        message: "Email skipped due to SKIP_EMAILS environment variable",
      };
    }

    const mailOptions = {
      from: `"${name}" <${process.env.EMAIL}>`,
      to: process.env.DESTINATION_EMAIL,
      subject: `New Contact Form Submission from ${name}`,
      text: `From: ${name} <${email}>\nMessage: ${message}`,
      html: `
        <p>From: ${name} &lt;${email}&gt;</p>
        <p>Message: ${message}</p>
      `,
    };
    return this.transporter.sendMail(mailOptions);
  }

  async returnMail(name, email) {
    if (this.shouldSkipEmails()) {
      console.log(
        `[MAIL SKIP] Return confirmation mail would be sent to: ${email} for: ${name}`,
      );
      return {
        message: "Email skipped due to SKIP_EMAILS environment variable",
      };
    }

    const signature = `
        Best regards,
        <br>
        Drospect Team
        <br>
        <br>
        <i>Enabling AI-powered inspection of energy infrastructure ☀️</i>
        <br>
        <img src="https://storage.googleapis.com/solar-panel-detection-1.appspot.com/drospect_logo/Group%20110.png" alt="Drospect">
    `;

    const customisedMessage = `
        Dear ${name},
        <br><br>
        Thank you for reaching out. This is a confirmation that we have received your request. Our team will be on it right away and contact you very soon.
        <br><br>
        ${signature}
    `;

    const mailOptions = {
      from: `"Drospect" <${process.env.EMAIL}>`,
      to: email,
      subject: `Confirmation of your message, ${name}`,
      text: `
        Dear ${name},

        Thank you for reaching out. This is a confirmation that we have received your request. Our team will be on it right away and contact you very soon.
      `,
      html: customisedMessage,
    };
    return this.transporter.sendMail(mailOptions);
  }

  async mailImageTrigger(
    id: number,
    projectName: string,
    imageCount: number,
    drone: any,
  ) {
    if (this.shouldSkipEmails()) {
      console.log(
        `[MAIL SKIP] Image trigger mail would be sent to: ${process.env.DESTINATION_EMAIL} for project: ${projectName} (ID: ${id}) with ${imageCount} images`,
      );
      return {
        message: "Email skipped due to SKIP_EMAILS environment variable",
      };
    }

    const make = drone.make;
    const model = drone.model;
    const imageDescription = drone.imageDescription;

    const droneInfo = `The drone is ${make}, model ${model}and image description: ${imageDescription}.`;
    const mailOptions = {
      from: `"Drospect Team" <${process.env.EMAIL}>`,
      to: [process.env.DESTINATION_EMAIL],
      subject: `Images Uploaded to Project: ${projectName}`,
      text: `\nProject ID: ${id}\nProject Name: ${projectName}\nNumber of Images: ${imageCount}\nMessage: Please start processing the images.`,
      html: `
        <p>Project ID: ${id}</p>
        <p>Project Name: ${projectName}</p>
        <p>Number of Images: ${imageCount}</p>
        <p> ${droneInfo} </p>
        <p>Please proceed with processing the images as soon as possible.</p>
      `,
    };
    return this.transporter.sendMail(mailOptions);
  }

  async mailImageInspectionComplete(
    id: number,
    projectName: string,
    toEmail: string,
  ) {
    if (this.shouldSkipEmails()) {
      console.log(
        `[MAIL SKIP] Inspection complete mail would be sent to: ${toEmail} for project: ${projectName} (ID: ${id})`,
      );
      return {
        message: "Email skipped due to SKIP_EMAILS environment variable",
      };
    }

    const customisedMessage = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Inspection Complete - Drospect</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #FF6B00 0%, #7000FF 100%); padding: 40px 30px; text-align: center;">
                <div style="margin-bottom: 20px;">
                    <div style="background-color: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                        <img src="https://storage.googleapis.com/solar-panel-detection-1.appspot.com/drospect_logo/Group%20110.png" 
                             alt="Drospect" 
                             style="width: 160px; height: auto; display: block;"
                             onerror="this.style.display='none'"/>
                    </div>
                </div>
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                    Inspection Complete
                </h1>
                <p style="color: #ffffff; margin: 15px 0 0 0; font-size: 16px; opacity: 0.9;">
                    Your solar panel analysis is ready
                </p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 40px 30px;">
                <!-- Project Info -->
                <div style="background-color: #140d2b; border-radius: 20px; padding: 30px; margin-bottom: 30px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                        Project: ${projectName}
                    </h2>
                    <div style="background: linear-gradient(135deg, #FF6B00 0%, #7000FF 100%); border-radius: 16px; padding: 20px; margin: 20px 0;">
                        <p style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600;">
                            ✓ Analysis Complete
                        </p>
                        <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">
                            Project ID: #${id}
                        </p>
                    </div>
                </div>

                <!-- Results Summary -->
                <div style="border: 2px solid #FF6B00; border-radius: 20px; padding: 30px; margin: 30px 0;">
                    <h3 style="color: #140d2b; margin: 0 0 25px 0; font-size: 20px; text-align: center; font-weight: 600;">
                        ✅ Analysis Complete
                    </h3>
                    
                    <div style="background-color: #f8f9fa; border-radius: 16px; padding: 25px; text-align: center;">
                        <h4 style="color: #140d2b; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">AI Analysis Completed</h4>
                        <p style="color: #666; margin: 0 0 15px 0; font-size: 15px; line-height: 1.6;">
                            Your solar panel images have been thoroughly analyzed using advanced computer vision technology.
                        </p>
                        <div style="background: linear-gradient(135deg, #FF6B00 0%, #7000FF 100%); color: white; padding: 12px 24px; border-radius: 25px; display: inline-block; font-size: 14px; font-weight: 600; margin-top: 10px;">
                            Results Ready for Review
                        </div>
                    </div>
                </div>

                <!-- Next Steps -->
                <div style="background-color: #f8f9fa; border-radius: 20px; padding: 30px; margin: 30px 0;">
                    <h3 style="color: #140d2b; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">
                        Next Steps
                    </h3>
                    <div style="color: #666; font-size: 15px; line-height: 1.6;">
                        <p style="margin: 0 0 12px 0;">• Review detailed results in your dashboard</p>
                        <p style="margin: 0 0 12px 0;">• Download comprehensive reports</p>
                        <p style="margin: 0 0 12px 0;">• Schedule maintenance for flagged panels</p>
                        <p style="margin: 0;">• Monitor performance improvements</p>
                    </div>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="https://www.drospect.ai/login" 
                       style="display: inline-block; background: linear-gradient(135deg, #FF6B00 0%, #7000FF 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 16px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 16px rgba(255, 107, 0, 0.3);">
                        View Results
                    </a>
                    <p style="color: #666; margin: 15px 0 0 0; font-size: 14px;">
                        Access your dashboard for detailed analytics
                    </p>
                </div>

                <!-- Support -->
                <div style="background-color: #f8f9fa; border-radius: 16px; padding: 20px; text-align: center; margin: 30px 0;">
                    <p style="color: #666; margin: 0; font-size: 14px;">
                        Questions about your results?<br>
                        <a href="mailto:info@drospect.ai" style="color: #FF6B00; text-decoration: none; font-weight: 600;">info@drospect.ai</a>
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #140d2b; padding: 30px; text-align: center; border-radius: 0 0 20px 20px;">
                <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
                    Best regards,<br>
                    <span style="color: #FF6B00;">Drospect Team</span>
                </p>
                <p style="color: #888; margin: 0; font-size: 14px;">
                    AI-powered solar panel inspection
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"Drospect Team" <${process.env.EMAIL}>`,
      to: [toEmail],
      subject: `Inspection Complete - Project ${projectName}`,
      text: `
    Project ${projectName} inspection is complete.

    Your solar panel images have been analyzed and categorized. 
    
    Project ID: ${id}
    
    To view detailed results, visit: https://www.drospect.ai/login
    
    If you have any questions, contact us at info@drospect.ai
    
    Best regards,
    Drospect Team
    AI-powered solar panel inspection
  `,
      html: customisedMessage,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async mailImageInspectionStarted(
    id: number,
    projectName: string,
    imageCount: number,
    toEmail: string,
  ) {
    if (this.shouldSkipEmails()) {
      console.log(
        `[MAIL SKIP] Inspection started mail would be sent to: ${toEmail} for project: ${projectName} (ID: ${id}) with ${imageCount} images`,
      );
      return {
        message: "Email skipped due to SKIP_EMAILS environment variable",
      };
    }

    const customisedMessage = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Inspection Started - Drospect</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #FF6B00 0%, #7000FF 100%); padding: 40px 30px 60px 30px; text-align: center;">
                <div style="margin-bottom: 20px;">
                    <div style="background-color: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                        <img src="https://storage.googleapis.com/solar-panel-detection-1.appspot.com/drospect_logo/Group%20110.png" 
                             alt="Drospect" 
                             style="width: 160px; height: auto; display: block;"
                             onerror="this.style.display='none'"/>
                    </div>
                </div>
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                    AI Inspection Started
                </h1>
                <p style="color: #ffffff; margin: 15px 0 0 0; font-size: 16px; opacity: 0.9;">
                    Your solar panel analysis is now in progress
                </p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 40px 30px; clip-path: ellipse(100% 55% at 50% 0%); margin-top: -30px; position: relative;">

                <!-- Processing Details -->
                <div style="border: 2px solid #FF6B00; border-radius: 20px; padding: 30px; margin: 30px 0;">
                    <h3 style="color: #140d2b; margin: 0 0 25px 0; font-size: 20px; text-align: center; font-weight: 600;">
                        📊 Processing Details
                    </h3>
                    
                    <div style="background-color: #f8f9fa; border-radius: 16px; padding: 25px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #ddd;">
                            <span style="color: #666; font-weight: 500;">Project ID:</span>
                            <span style="color: #140d2b; font-weight: 600; margin-left: 15px;">#${id}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #ddd;">
                            <span style="color: #666; font-weight: 500;">Images to Process:</span>
                            <span style="color: #140d2b; font-weight: 600; margin-left: 15px;">${imageCount} images</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #666; font-weight: 500;">Status:</span>
                            <div style="margin-left: 15px; display: flex; align-items: center;">
                                <span style="background: linear-gradient(135deg, #FF6B00 0%, #7000FF 100%); color: white; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 700; box-shadow: 0 2px 8px rgba(255, 107, 0, 0.3);">
                                    ⚡ PROCESSING
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- AI Process Info -->
                <div style="background-color: #f8f9fa; border-radius: 20px; padding: 35px; margin: 35px 0; border-left: 4px solid #FF6B00; border-right: 4px solid #FF6B00;">
                    <h3 style="color: #140d2b; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">
                        What's Happening Now?
                    </h3>
                    <p style="color: #666; margin: 0; line-height: 1.8; font-size: 15px;">
                        Our AI system is analyzing your solar panel images using advanced computer vision technology. 
                        Each image will be examined to detect defects and anomalies, then categorized for your review.
                    </p>
                </div>

                <!-- Next Steps -->
                <div style="text-align: center; margin: 45px 0;">
                    <h3 style="color: #140d2b; margin: 0 0 25px 0; font-size: 20px; font-weight: 600;">What's Next?</h3>
                    <p style="color: #666; margin: 0 0 30px 0; font-size: 15px; line-height: 1.6; max-width: 480px; margin-left: auto; margin-right: auto;">
                        You'll receive a completion notification with detailed results once processing is finished.
                        Monitor real-time progress on your dashboard.
                    </p>
                    
                    <a href="https://www.drospect.ai/login" 
                       style="display: inline-block; background: linear-gradient(135deg, #FF6B00 0%, #7000FF 100%); color: white; padding: 18px 36px; text-decoration: none; border-radius: 16px; font-weight: 600; font-size: 16px; box-shadow: 0 6px 20px rgba(255, 107, 0, 0.4); transform: translateY(0); transition: all 0.3s ease;">
                        📊 View Dashboard
                    </a>
                    <p style="color: #999; margin: 12px 0 0 0; font-size: 13px;">
                        Monitor your inspection progress in real-time
                    </p>
                </div>

                <!-- Support -->
                <div style="background-color: #f8f9fa; border-radius: 16px; padding: 20px; text-align: center; margin: 30px 0;">
                    <p style="color: #666; margin: 0; font-size: 14px;">
                        Questions? Our support team is here to help!<br>
                        <a href="mailto:info@drospect.ai" style="color: #FF6B00; text-decoration: none; font-weight: 600;">info@drospect.ai</a>
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #140d2b; padding: 30px; text-align: center; border-radius: 0 0 20px 20px;">
                <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
                    Best regards,<br>
                    <span style="color: #FF6B00;">Drospect Team</span>
                </p>
                <p style="color: #888; margin: 0; font-size: 14px;">
                    AI-powered solar panel inspection
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"Drospect Team" <${process.env.EMAIL}>`,
      to: [toEmail],
      subject: `AI Inspection Started - Project ${projectName}`,
      text: `
    AI Inspection Started for Project ${projectName}

    Your AI inspection has been started for project ${projectName}.
    
    Processing Details:
    - Project ID: ${id}
    - Number of images: ${imageCount}
    - Status: Processing in progress

    Our AI system is now analyzing your images to detect solar panel defects.
    You will receive another email notification once the processing is complete.

    Visit our website at https://www.drospect.ai/login to monitor progress.

    Best regards,
    Drospect Team
    AI-powered solar panel inspection
  `,
      html: customisedMessage,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async mailImageClassificationTrigger(
    id: number,
    projectName: string,
    imageCount: number,
  ) {
    const mailOptions = {
      from: `"Drospect Team" <${process.env.EMAIL}>`,
      to: [process.env.DESTINATION_EMAIL],
      subject: `Classification Request for Project: ${projectName}`,
      text: `\nProject ID: ${id}\nProject Name: ${projectName}\nNumber of Images: ${imageCount}\nMessage: Please start image classification for RGB (dust, sunlight, obstruction) and thermal (anomaly detection) analysis.`,
      html: `
        <p>Project ID: ${id}</p>
        <p>Project Name: ${projectName}</p>
        <p>Number of Images: ${imageCount}</p>
        <p>Classification Types:</p>
        <ul>
          <li>RGB Images: Dust, Sunlight, and Obstruction Detection</li>
          <li>Thermal Images: Thermal Anomaly Detection</li>
        </ul>
        <p>Please proceed with image classification as soon as possible.</p>
      `,
    };
    return this.transporter.sendMail(mailOptions);
  }

  async mailImageClassificationStarted(
    id: number,
    projectName: string,
    imageCount: number,
    toEmail: string,
  ) {
    const signature = `
    <div style="font-family: Arial, sans-serif; color: #333;">
        <p style="margin: 0;">Best regards,</p>
        <p style="margin: 0;">Drospect Team</p>
        <br>
        <i style="color: #555;">Enabling AI-powered inspection of energy infrastructure ☀️</i>
        <br><br>
        <img src="https://storage.googleapis.com/solar-panel-detection-1.appspot.com/drospect_logo/Group%20110.png" 
             alt="Drospect Logo" 
             style="width: 150px; height: auto;"/>
    </div>
`;

    const customisedMessage = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #708090;">Image Classification Started for Project ${projectName}</h2>
        <p>Your image classification has been successfully started for project <strong>${projectName}</strong>.</p>
        <p><strong>Classification Details:</strong></p>
        <ul style="color: #555;">
            <li>Project ID: ${id}</li>
            <li>Number of images: ${imageCount}</li>
            <li>Classification Types:
                <ul>
                    <li>RGB Images: Dust, Sunlight, and Obstruction Detection</li>
                    <li>Thermal Images: Thermal Anomaly Detection</li>
                </ul>
            </li>
            <li>Status: Classification in progress</li>
        </ul>
        <p>Our AI system is now analyzing your images to classify various issues including dust, sunlight glare, obstructions, and thermal anomalies.</p>
        <p>You will receive another email notification once the classification is complete with detailed results.</p>
        <p>You can monitor the progress by visiting our website at <a href="https://www.drospect.ai/login" style="color: #1E90FF; text-decoration: none;">drospect.ai</a>.</p>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <br>
        ${signature}
    </div>
`;

    const mailOptions = {
      from: `"Drospect Team" <${process.env.EMAIL}>`,
      to: [toEmail],
      subject: `Image Classification Started - Project ${projectName}`,
      text: `
    Image Classification Started for Project ${projectName}

    Your image classification has been successfully started for project ${projectName}.
    
    Classification Details:
    - Project ID: ${id}
    - Number of images: ${imageCount}
    - Classification Types:
      * RGB Images: Dust, Sunlight, and Obstruction Detection
      * Thermal Images: Thermal Anomaly Detection
    - Status: Classification in progress

    Our AI system is now analyzing your images to classify various issues.
    You will receive another email notification once the classification is complete.

    Visit our website at https://www.drospect.ai/login to monitor progress.

    Best regards,
    Drospect Team

    Enabling AI-powered inspection of energy infrastructure ☀️
  `,
      html: customisedMessage,
    };

    return this.transporter.sendMail(mailOptions);
  }

  /**
   * Send an internal email when an inspection job fails (DROSPECT or SCOPITO)
   * @param jobInfo { source: string; id: number; model?: string; projectId?: number; scopitoProjectId?: number; modelType?: number; error?: string; [key: string]: any }
   */
  async mailInspectionJobFailed(jobInfo: {
    source: string;
    id: number;
    model?: string;
    projectId?: number;
    scopitoProjectId?: number;
    modelType?: number;
    error?: string;
    [key: string]: any;
  }) {
    const { source, id, error } = jobInfo;
    let subject = "";
    if (source === "SCOPITO") {
      subject = `SCOPITO job ${id} failed`;
    } else {
      subject = `DROSPECT job ${id} failed`;
    }
    // Compose a detailed body as an HTML table (without stack)
    let html = `<h2>Inspection Job Failure Notification</h2>`;
    html += `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse; font-family:sans-serif; font-size:15px;">
      <tr><th align="left">Field</th><th align="left">Value</th></tr>`;
    for (const [key, value] of Object.entries(jobInfo)) {
      if (key === "error") {
        html += `<tr><td><b>${
          key.charAt(0).toUpperCase() + key.slice(1)
        }</b></td><td style='color:red;'>${value}</td></tr>`;
      } else if (key === "stack") {
        continue; // Skip stack
      } else {
        html += `<tr><td><b>${
          key.charAt(0).toUpperCase() + key.slice(1)
        }</b></td><td>${value}</td></tr>`;
      }
    }
    html += `</table>`;
    if (error) {
      html += `<p style='color:red; font-weight:bold;'>Error: ${error}</p>`;
    }
    const mailOptions = {
      from: `"Drospect System" <${process.env.EMAIL}>`,
      to: process.env.DESTINATION_EMAIL,
      subject,
      text: `Inspection job failed.\n\n${Object.entries(jobInfo)
        .filter(([k]) => k !== "stack")
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")}${error ? `\nError: ${error}` : ""}`,
      html,
    };
    return this.transporter.sendMail(mailOptions);
  }

  async sendInternalAlert(subject: string, content: string): Promise<any> {
    if (this.shouldSkipEmails()) {
      console.log(
        `[MAIL SKIP] Internal alert would be sent to: ${
          process.env.INTERNAL_OPS_EMAIL || process.env.DESTINATION_EMAIL
        }`,
      );
      return {
        message:
          "Internal alert skipped due to SKIP_EMAILS environment variable",
      };
    }

    const opsEmail =
      process.env.INTERNAL_OPS_EMAIL || process.env.DESTINATION_EMAIL;

    if (!opsEmail) {
      console.error("No internal ops email configured");
      return { error: "No internal ops email configured" };
    }

    const mailOptions = {
      from: `"Drospect System Monitor" <${process.env.EMAIL}>`,
      to: opsEmail,
      subject: `[Drospect Alert] ${subject}`,
      text: content,
      html: `<pre style="font-family: monospace; white-space: pre-wrap;">${content}</pre>`,
    };

    console.log(`Sending internal alert to: ${opsEmail}`);
    return this.transporter.sendMail(mailOptions);
  }
}
