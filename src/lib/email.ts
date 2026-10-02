import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_SECURE = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : SMTP_PORT === 465;
const SMTP_FROM = process.env.SMTP_FROM || `"MountLift Ops" <${SMTP_USER || "ops@mountlift.com"}>`;

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: "DELIVERABLE_ASSIGNED" | "STATUS_UPDATED" | "PAYOUT_PROCESSED" | "PORTAL_INVITE" | "GENERAL";
  metadata?: Record<string, any>;
}

export async function sendEmail({ to, subject, html, text, type, metadata }: SendEmailOptions): Promise<{ success: boolean; mocked?: boolean; error?: string }> {
  const cleanTo = String(to || "").trim();
  if (!cleanTo || !cleanTo.includes("@")) {
    console.warn(`[Email] Skipped sending: invalid recipient "${cleanTo}"`);
    return { success: false, error: "Invalid recipient email" };
  }

  // Check if SMTP is configured
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`[Email MOCK] (SMTP not configured)`);
    console.log(`To: ${cleanTo} | Subject: ${subject} | Type: ${type}`);

    try {
      await prisma.notificationLog.create({
        data: {
          recipient: cleanTo,
          subject,
          type,
          status: "MOCKED",
          metadata: metadata || {},
        },
      });
    } catch (dbErr) {
      console.error("[Email Log DB Error]", dbErr);
    }

    return { success: true, mocked: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: SMTP_FROM,
      to: cleanTo,
      subject,
      text,
      html,
    });

    console.log(`[Email SENT] To: ${cleanTo} | Subject: ${subject}`);

    try {
      await prisma.notificationLog.create({
        data: {
          recipient: cleanTo,
          subject,
          type,
          status: "SENT",
          metadata: metadata || {},
        },
      });
    } catch (dbErr) {
      console.error("[Email Log DB Error]", dbErr);
    }

    return { success: true };
  } catch (error: any) {
    console.error(`[Email Error] Failed to send email to ${cleanTo}:`, error?.message || error);

    try {
      await prisma.notificationLog.create({
        data: {
          recipient: cleanTo,
          subject,
          type,
          status: "FAILED",
          error: error?.message || "Unknown SMTP error",
          metadata: metadata || {},
        },
      });
    } catch (dbErr) {
      console.error("[Email Log DB Error]", dbErr);
    }

    return { success: false, error: error?.message };
  }
}

/**
 * Base Luxury Email Layout Wrapper
 */
function wrapEmailTemplate(title: string, preheader: string, contentHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF8F4; color: #1A1815; margin: 0; padding: 0; }
    .container { max-width: 580px; margin: 30px auto; background-color: #FFFFFF; border: 1px solid #E7E1D4; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(26,24,21,0.04); }
    .header { background-color: #1A1815; color: #FAF8F4; padding: 24px 32px; text-align: left; }
    .header h1 { margin: 0; font-size: 18px; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 700; color: #FAF8F4; }
    .header span { color: #CC9A3D; }
    .body { padding: 32px; font-size: 14px; line-height: 1.6; color: #1A1815; }
    .footer { padding: 20px 32px; font-size: 11px; color: #7A7266; text-align: center; border-top: 1px solid #E7E1D4; background-color: #FAF8F4; }
    .btn { display: inline-block; background-color: #CC9A3D; color: #FFFFFF !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 13px; margin-top: 20px; }
    .highlight-card { background-color: #FAF8F4; border: 1px solid #E7E1D4; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .data-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .data-label { color: #7A7266; font-size: 12px; }
    .data-value { font-weight: 600; color: #1A1815; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#FAF8F4;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>
  <div class="container">
    <div class="header">
      <h1>Mount<span>Lift</span> Creative Ops</h1>
    </div>
    <div class="body">
      ${contentHtml}
    </div>
    <div class="footer">
      MountLift Influencer Marketing & Creative Management<br>
      This is an automated operational notification.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 1. Deliverable Assigned Email
 */
export async function sendDeliverableAssignedEmail(params: {
  creatorEmail: string;
  creatorName: string;
  brandName: string;
  campaignName: string;
  deliverableType: string;
  agreedRate?: number;
  dueDate?: Date | null;
  portalUrl?: string;
}) {
  const { creatorEmail, creatorName, brandName, campaignName, deliverableType, agreedRate, dueDate, portalUrl } = params;
  const dueFormatted = dueDate
    ? dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "To be confirmed";

  const rateFormatted = agreedRate && agreedRate > 0
    ? `₹${agreedRate.toLocaleString("en-IN")}`
    : "As per agreement";

  const subject = `New Collaboration: ${deliverableType} for ${brandName}`;
  const preheader = `You have been assigned a new ${deliverableType} deliverable for ${brandName} on MountLift.`;

  const html = wrapEmailTemplate(
    subject,
    preheader,
    `
      <p style="font-size: 16px; margin-top: 0;">Hi <strong>${creatorName}</strong>,</p>
      <p>A new brand collaboration has been assigned to you by the MountLift creative team.</p>

      <div class="highlight-card">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #7A7266; font-size: 12px;">Brand Partner</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1A1815;">${brandName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #7A7266; font-size: 12px;">Campaign</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1A1815;">${campaignName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #7A7266; font-size: 12px;">Deliverable Format</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #CC9A3D;">${deliverableType}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #7A7266; font-size: 12px;">Deadline</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1A1815;">${dueFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #7A7266; font-size: 12px;">Agreed Fee</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1A1815;">${rateFormatted}</td>
          </tr>
        </table>
      </div>

      <p>Please review the creative requirements and keep your manager posted on production timelines.</p>

      ${portalUrl ? `<center><a href="${portalUrl}" class="btn">Open Creator Portal →</a></center>` : ""}
    `
  );

  const text = `Hi ${creatorName},\n\nA new brand collaboration (${deliverableType}) for ${brandName} (${campaignName}) has been assigned to you.\n\nDeadline: ${dueFormatted}\nAgreed Fee: ${rateFormatted}\n\nMountLift Creative Ops.`;

  return sendEmail({
    to: creatorEmail,
    subject,
    html,
    text,
    type: "DELIVERABLE_ASSIGNED",
    metadata: { brandName, campaignName, deliverableType, agreedRate, dueDate },
  });
}

/**
 * 2. Deliverable Status Updated Email
 */
export async function sendDeliverableStatusUpdatedEmail(params: {
  creatorEmail: string;
  creatorName: string;
  brandName: string;
  deliverableType: string;
  status: string;
  feedback?: string;
  portalUrl?: string;
}) {
  const { creatorEmail, creatorName, brandName, deliverableType, status, feedback, portalUrl } = params;
  const statusFormatted = status.replace(/_/g, " ").toUpperCase();
  const subject = `Deliverable Update: ${deliverableType} for ${brandName} is ${statusFormatted}`;
  const preheader = `Your ${deliverableType} for ${brandName} has been updated to ${statusFormatted}.`;

  const html = wrapEmailTemplate(
    subject,
    preheader,
    `
      <p style="font-size: 16px; margin-top: 0;">Hi <strong>${creatorName}</strong>,</p>
      <p>The status of your <strong>${deliverableType}</strong> for <strong>${brandName}</strong> has been updated.</p>

      <div class="highlight-card">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #7A7266; font-size: 12px;">Brand</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600;">${brandName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #7A7266; font-size: 12px;">Deliverable</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600;">${deliverableType}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #7A7266; font-size: 12px;">Current Status</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #CC9A3D;">${statusFormatted}</td>
          </tr>
        </table>
        ${feedback ? `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #E7E1D4; font-size: 13px; color: #1A1815;"><strong>Feedback / Note:</strong><br>${feedback}</div>` : ""}
      </div>

      ${portalUrl ? `<center><a href="${portalUrl}" class="btn">View in Portal →</a></center>` : ""}
    `
  );

  const text = `Hi ${creatorName},\n\nYour ${deliverableType} for ${brandName} is now: ${statusFormatted}.\n${feedback ? `Note: ${feedback}\n` : ""}\nMountLift Creative Ops.`;

  return sendEmail({
    to: creatorEmail,
    subject,
    html,
    text,
    type: "STATUS_UPDATED",
    metadata: { brandName, deliverableType, status, feedback },
  });
}

/**
 * 3. Payout Processed Email
 */
export async function sendPayoutNotificationEmail(params: {
  creatorEmail: string;
  creatorName: string;
  amount: number;
  status: string;
  reference?: string;
  portalUrl?: string;
}) {
  const { creatorEmail, creatorName, amount, status, reference, portalUrl } = params;
  const statusFormatted = status.toUpperCase();
  const subject = `Payout Update: ₹${amount.toLocaleString("en-IN")} (${statusFormatted})`;
  const preheader = `A payout of ₹${amount.toLocaleString("en-IN")} has been marked as ${statusFormatted}.`;

  const html = wrapEmailTemplate(
    subject,
    preheader,
    `
      <p style="font-size: 16px; margin-top: 0;">Hi <strong>${creatorName}</strong>,</p>
      <p>Here is an update regarding your creator payout from MountLift.</p>

      <div class="highlight-card">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #7A7266; font-size: 12px;">Payout Amount</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; font-size: 16px; color: #CC9A3D;">₹${amount.toLocaleString("en-IN")}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #7A7266; font-size: 12px;">Status</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600;">${statusFormatted}</td>
          </tr>
          ${reference ? `
          <tr>
            <td style="padding: 6px 0; color: #7A7266; font-size: 12px;">Reference</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 500; font-family: monospace;">${reference}</td>
          </tr>` : ""}
        </table>
      </div>

      <p>Thank you for your creative collaboration with our brand partners.</p>

      ${portalUrl ? `<center><a href="${portalUrl}" class="btn">View Portal & Invoices →</a></center>` : ""}
    `
  );

  const text = `Hi ${creatorName},\n\nA payout of ₹${amount.toLocaleString("en-IN")} has been updated to: ${statusFormatted}.\n${reference ? `Reference: ${reference}\n` : ""}\nMountLift Finance Team.`;

  return sendEmail({
    to: creatorEmail,
    subject,
    html,
    text,
    type: "PAYOUT_PROCESSED",
    metadata: { amount, status, reference },
  });
}

/**
 * 4. Creator Portal Invite Email
 */
export async function sendCreatorPortalInviteEmail(params: {
  creatorEmail: string;
  creatorName: string;
  portalUrl: string;
}) {
  const { creatorEmail, creatorName, portalUrl } = params;
  const subject = `Welcome to MountLift — Your Private Creator Portal`;
  const preheader = `Access your verified MountLift score, brand deliverables, and daily AI content sparks.`;

  const html = wrapEmailTemplate(
    subject,
    preheader,
    `
      <p style="font-size: 16px; margin-top: 0;">Hi <strong>${creatorName}</strong>,</p>
      <p>Your personalized <strong>MountLift Creator Portal</strong> is ready.</p>
      <p>Connect your Instagram account to compute your verified MountLift Score, access daily trending viral hooks, and track your brand collaboration deliverables in real-time.</p>

      <center style="margin: 28px 0;">
        <a href="${portalUrl}" class="btn">Access Your Creator Portal →</a>
      </center>

      <p style="font-size: 12px; color: #7A7266;">
        Bookmark your private portal link for easy access on mobile and desktop. No password needed.
      </p>
    `
  );

  const text = `Hi ${creatorName},\n\nYour MountLift Creator Portal is ready: ${portalUrl}\n\nAccess your verified score, deliverables, and daily viral hooks.\n\nMountLift Creative Ops.`;

  return sendEmail({
    to: creatorEmail,
    subject,
    html,
    text,
    type: "PORTAL_INVITE",
    metadata: { portalUrl },
  });
}
