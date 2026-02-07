import { Resend } from "resend";
import { env, features } from "./env";
import { logger } from "./logger";

// Initialize Resend only if API key is available
const resend = features.email ? new Resend(env.RESEND_API_KEY) : null;

const FROM_EMAIL = env.EMAIL_FROM;

const log = logger.child({ service: "email" });

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  if (!resend) {
    if (env.NODE_ENV === "production") {
      log.error("RESEND_API_KEY is not configured in production - cannot send emails");
      throw new Error("Email service not configured");
    }
    log.warn("Email not configured - skipping password reset email");
    log.debug({ resetUrl }, "Password reset URL (dev only)");
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your AlgoStudio password",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #CBD5E1; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Reset your password</h1>
            <p style="margin: 0 0 24px 0; line-height: 1.6;">
              We received a request to reset your AlgoStudio password. Click the button below to choose a new password.
            </p>
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              Reset Password
            </a>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #94A3B8;">
              This link will expire in 1 hour.
            </p>
            <p style="margin: 0; font-size: 14px; color: #64748B;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    log.error({ error, to: email.substring(0, 3) + "***" }, "Failed to send password reset email");
    throw new Error("Failed to send email");
  }

  log.info({ to: email.substring(0, 3) + "***" }, "Password reset email sent");
}

export async function sendWelcomeEmail(email: string, loginUrl: string) {
  if (!resend) {
    if (env.NODE_ENV === "production") {
      log.error("RESEND_API_KEY is not configured in production - cannot send emails");
    }
    log.warn("Email not configured - skipping welcome email");
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Welcome to AlgoStudio",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #CBD5E1; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Welcome to AlgoStudio</h1>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">
              Your account has been created. You can now start building Expert Advisors with our visual strategy builder.
            </p>
            <p style="margin: 0 0 24px 0; line-height: 1.6;">
              Get started by creating your first project or choosing from one of our strategy templates.
            </p>
            <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              Open AlgoStudio
            </a>
            <div style="margin: 24px 0 0 0; padding: 24px; background-color: rgba(79, 70, 229, 0.1); border-radius: 8px; border: 1px solid rgba(79, 70, 229, 0.2);">
              <p style="margin: 0 0 12px 0; color: #ffffff; font-weight: 600;">Join our community</p>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6;">
                Connect with other traders, share strategies, get support, and stay up to date with the latest features.
              </p>
              <a href="https://whop.com/algostudio" style="display: inline-block; background-color: transparent; color: #A78BFA; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; border: 1px solid rgba(79, 70, 229, 0.5);">
                Join on Whop
              </a>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    log.error({ error, to: email.substring(0, 3) + "***" }, "Failed to send welcome email");
    // Don't throw — welcome email failure should not block registration
  } else {
    log.info({ to: email.substring(0, 3) + "***" }, "Welcome email sent");
  }
}
