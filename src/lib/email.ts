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

export async function sendVerificationEmail(email: string, verifyUrl: string) {
  if (!resend) {
    if (env.NODE_ENV === "production") {
      log.error("RESEND_API_KEY is not configured in production - cannot send emails");
    }
    log.warn("Email not configured - skipping verification email");
    log.debug({ verifyUrl }, "Verification URL (dev only)");
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Verify your AlgoStudio email",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #CBD5E1; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Verify your email</h1>
            <p style="margin: 0 0 24px 0; line-height: 1.6;">
              Please confirm your email address to complete your AlgoStudio registration.
            </p>
            <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              Verify Email
            </a>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #94A3B8;">
              This link will expire in 24 hours.
            </p>
            <p style="margin: 0; font-size: 14px; color: #64748B;">
              If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    log.error({ error, to: email.substring(0, 3) + "***" }, "Failed to send verification email");
  } else {
    log.info({ to: email.substring(0, 3) + "***" }, "Verification email sent");
  }
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

export async function sendOnboardingDay1Email(email: string, appUrl: string) {
  if (!resend) {
    log.warn("Email not configured - skipping onboarding day 1 email");
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Build your first trading strategy",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #CBD5E1; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Ready to build your first EA?</h1>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">
              Here are 3 quick steps to get started:
            </p>
            <ol style="margin: 0 0 24px 0; padding-left: 20px; line-height: 2;">
              <li><strong style="color: #ffffff;">Create a project</strong> — choose from a template or start blank</li>
              <li><strong style="color: #ffffff;">Add blocks</strong> — drag indicators and actions onto the canvas</li>
              <li><strong style="color: #ffffff;">Export</strong> — download your .mq5 file for MetaTrader 5</li>
            </ol>
            <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              Start Building
            </a>
            <p style="margin: 0; font-size: 14px; color: #64748B;">
              Tip: Try the &ldquo;MA Crossover&rdquo; template to see how strategies are built.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    log.error(
      { error, to: email.substring(0, 3) + "***" },
      "Failed to send onboarding day 1 email"
    );
  } else {
    log.info({ to: email.substring(0, 3) + "***" }, "Onboarding day 1 email sent");
  }
}

export async function sendOnboardingDay3Email(email: string, pricingUrl: string) {
  if (!resend) {
    log.warn("Email not configured - skipping onboarding day 3 email");
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your strategy is ready to export",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #CBD5E1; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Take your strategy live</h1>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">
              You have 2 free exports per month on your current plan. That&apos;s enough to test your strategy in MetaTrader 5.
            </p>
            <p style="margin: 0 0 24px 0; line-height: 1.6;">
              Need more exports or access to trade management features like trailing stops and partial closes? Check out our paid plans.
            </p>
            <a href="${pricingUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              View Plans
            </a>
            <p style="margin: 0; font-size: 14px; color: #64748B;">
              Questions? Reply to this email or join our community on <a href="https://whop.com/algostudio" style="color: #A78BFA; text-decoration: none;">Whop</a>.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    log.error(
      { error, to: email.substring(0, 3) + "***" },
      "Failed to send onboarding day 3 email"
    );
  } else {
    log.info({ to: email.substring(0, 3) + "***" }, "Onboarding day 3 email sent");
  }
}

export async function sendAccountDeletedEmail(email: string) {
  if (!resend) {
    log.warn("Email not configured - skipping account deleted email");
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your AlgoStudio account has been deleted",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #CBD5E1; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Account deleted</h1>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">
              Your AlgoStudio account and all associated data have been permanently deleted as requested.
            </p>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">
              This includes all projects, strategy versions, export history, and personal information.
            </p>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">
              If your Stripe subscription was active, it has been cancelled automatically.
            </p>
            <p style="margin: 0; font-size: 14px; color: #64748B;">
              If you did not request this, please contact us immediately at contact@algo-studio.com.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    log.error({ error, to: email.substring(0, 3) + "***" }, "Failed to send account deleted email");
  } else {
    log.info({ to: email.substring(0, 3) + "***" }, "Account deleted confirmation email sent");
  }
}

export async function sendContactFormEmail(
  senderName: string,
  senderEmail: string,
  subject: string,
  message: string
) {
  if (!resend) {
    log.warn("Email not configured - skipping contact form email");
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: "contact@algo-studio.com",
    replyTo: senderEmail,
    subject: `[Contact] ${subject || "New message"}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #CBD5E1; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">New contact message</h1>
            <table style="width: 100%; margin: 0 0 24px 0; font-size: 14px;">
              <tr><td style="padding: 6px 0; color: #94A3B8; width: 80px;">From:</td><td style="padding: 6px 0; color: #ffffff;">${senderName}</td></tr>
              <tr><td style="padding: 6px 0; color: #94A3B8;">Email:</td><td style="padding: 6px 0;"><a href="mailto:${senderEmail}" style="color: #A78BFA;">${senderEmail}</a></td></tr>
              <tr><td style="padding: 6px 0; color: #94A3B8;">Subject:</td><td style="padding: 6px 0; color: #ffffff;">${subject || "—"}</td></tr>
            </table>
            <div style="padding: 20px; background-color: rgba(79, 70, 229, 0.1); border-radius: 8px; border: 1px solid rgba(79, 70, 229, 0.2); white-space: pre-wrap; line-height: 1.6;">
              ${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    log.error({ error }, "Failed to send contact form email");
    throw new Error("Failed to send message");
  }

  log.info({ from: senderEmail.substring(0, 3) + "***" }, "Contact form email sent");
}

export async function sendPaymentFailedEmail(email: string, portalUrl: string) {
  if (!resend) {
    log.warn("Email not configured - skipping payment failed email");
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Payment failed - Action required",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #CBD5E1; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Payment failed</h1>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">
              We were unable to process your latest payment for your AlgoStudio subscription.
            </p>
            <p style="margin: 0 0 24px 0; line-height: 1.6;">
              Please update your payment method to keep your subscription active. If payment is not resolved, your account will be downgraded to the Free plan.
            </p>
            <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              Update Payment Method
            </a>
            <p style="margin: 0; font-size: 14px; color: #64748B;">
              If you believe this is an error, please contact us at contact@algo-studio.com.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    log.error({ error, to: email.substring(0, 3) + "***" }, "Failed to send payment failed email");
  } else {
    log.info({ to: email.substring(0, 3) + "***" }, "Payment failed email sent");
  }
}
