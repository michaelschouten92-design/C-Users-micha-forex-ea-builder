import { Resend } from "resend";
import { env, features } from "./env";
import { logger } from "./logger";

// Initialize Resend only if API key is available
const resend = features.email ? new Resend(env.RESEND_API_KEY) : null;

const FROM_EMAIL = env.EMAIL_FROM;
const SUPPORT_EMAIL = env.SUPPORT_EMAIL || "support@algo-studio.com";

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
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #ffffff; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Reset your password</h1>
            <p style="margin: 0 0 24px 0; line-height: 1.6; color: #ffffff;">
              We received a request to reset your AlgoStudio password. Click the button below to choose a new password.
            </p>
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              Reset Password
            </a>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #E2E8F0;">
              This link will expire in 1 hour.
            </p>
            <p style="margin: 0; font-size: 14px; color: #CBD5E1;">
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
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #ffffff; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Verify your email</h1>
            <p style="margin: 0 0 24px 0; line-height: 1.6; color: #ffffff;">
              Please confirm your email address to complete your AlgoStudio registration.
            </p>
            <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              Verify Email
            </a>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #E2E8F0;">
              This link will expire in 24 hours.
            </p>
            <p style="margin: 0; font-size: 14px; color: #CBD5E1;">
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

export async function sendWelcomeEmail(email: string, loginUrl: string, verifyUrl?: string) {
  if (!resend) {
    if (env.NODE_ENV === "production") {
      log.error("RESEND_API_KEY is not configured in production - cannot send emails");
    }
    log.warn("Email not configured - skipping welcome email");
    return;
  }

  const verifySection = verifyUrl
    ? `
            <div style="margin: 0 0 24px 0; padding: 20px; background-color: rgba(79, 70, 229, 0.1); border-radius: 8px; border: 1px solid rgba(79, 70, 229, 0.2);">
              <p style="margin: 0 0 12px 0; line-height: 1.6; color: #ffffff; font-weight: 600;">
                First, verify your email address
              </p>
              <p style="margin: 0 0 16px 0; line-height: 1.6; color: #CBD5E1; font-size: 14px;">
                Please confirm your email to unlock all features.
              </p>
              <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Verify Email
              </a>
            </div>`
    : "";

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
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #ffffff; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Welcome to AlgoStudio</h1>
            <p style="margin: 0 0 16px 0; line-height: 1.6; color: #ffffff;">
              Your account has been created. You can now start building Expert Advisors with our visual strategy builder.
            </p>
            <p style="margin: 0 0 24px 0; line-height: 1.6; color: #ffffff;">
              Get started by creating your first project or choosing from one of our strategy templates.
            </p>${verifySection}
            <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              Open AlgoStudio
            </a>
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
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #ffffff; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Ready to build your first EA?</h1>
            <p style="margin: 0 0 16px 0; line-height: 1.6; color: #ffffff;">
              Here are 3 quick steps to get started:
            </p>
            <ol style="margin: 0 0 24px 0; padding-left: 20px; line-height: 2; color: #ffffff;">
              <li><strong style="color: #ffffff;">Create a project</strong> — choose from a template or start blank</li>
              <li><strong style="color: #ffffff;">Add blocks</strong> — drag indicators and actions onto the canvas</li>
              <li><strong style="color: #ffffff;">Export</strong> — download your .mq5 file for MetaTrader 5</li>
            </ol>
            <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              Start Building
            </a>
            <p style="margin: 0; font-size: 14px; color: #CBD5E1;">
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
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #ffffff; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Take your strategy live</h1>
            <p style="margin: 0 0 16px 0; line-height: 1.6; color: #ffffff;">
              You have 1 free export per month on your current plan. That&apos;s enough to test your strategy in MetaTrader 5.
            </p>
            <p style="margin: 0 0 24px 0; line-height: 1.6; color: #ffffff;">
              Need more exports or access to all strategy templates? Check out our paid plans.
            </p>
            <a href="${pricingUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              View Plans
            </a>
            <p style="margin: 0; font-size: 14px; color: #CBD5E1;">
              Questions? Reply to this email.
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
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #ffffff; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Account deleted</h1>
            <p style="margin: 0 0 16px 0; line-height: 1.6; color: #ffffff;">
              Your AlgoStudio account and all associated data have been permanently deleted as requested.
            </p>
            <p style="margin: 0 0 16px 0; line-height: 1.6; color: #ffffff;">
              This includes all projects, strategy versions, export history, and personal information.
            </p>
            <p style="margin: 0 0 16px 0; line-height: 1.6; color: #ffffff;">
              If your Stripe subscription was active, it has been cancelled automatically.
            </p>
            <p style="margin: 0; font-size: 14px; color: #CBD5E1;">
              If you did not request this, please contact us immediately at ${SUPPORT_EMAIL}.
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

  // Escape all user-provided values for safe HTML embedding
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const safeName = esc(senderName);
  const safeEmail = esc(senderEmail);
  const safeSubject = esc(subject);
  const safeMessage = esc(message);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: SUPPORT_EMAIL,
    replyTo: senderEmail,
    subject: `[Contact] ${subject || "New message"}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #ffffff; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">New contact message</h1>
            <table style="width: 100%; margin: 0 0 24px 0; font-size: 14px;">
              <tr><td style="padding: 6px 0; color: #E2E8F0; width: 80px;">From:</td><td style="padding: 6px 0; color: #ffffff;">${safeName}</td></tr>
              <tr><td style="padding: 6px 0; color: #E2E8F0;">Email:</td><td style="padding: 6px 0;"><a href="mailto:${safeEmail}" style="color: #A78BFA;">${safeEmail}</a></td></tr>
              <tr><td style="padding: 6px 0; color: #E2E8F0;">Subject:</td><td style="padding: 6px 0; color: #ffffff;">${safeSubject || "—"}</td></tr>
            </table>
            <div style="padding: 20px; background-color: rgba(79, 70, 229, 0.1); border-radius: 8px; border: 1px solid rgba(79, 70, 229, 0.2); white-space: pre-wrap; line-height: 1.6; color: #ffffff;">
              ${safeMessage}
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

const PLAN_WELCOME_FEATURES: Record<string, string[]> = {
  PRO: [
    "Unlimited projects",
    "Unlimited MQL5 + MQL4 exports",
    "MQL5 & MQL4 source code export",
    "Priority support",
  ],
  ELITE: [
    "Everything in Pro",
    "Early access to new features",
    "Prop firm configuration presets",
    "Direct developer support",
    "Weekly Elite members call",
  ],
};

export async function sendPlanChangeEmail(
  email: string,
  previousPlan: string,
  newPlan: string,
  isUpgrade: boolean,
  settingsUrl: string
) {
  if (!resend) {
    log.warn("Email not configured - skipping plan change email");
    return;
  }

  // Escape user-provided plan names for safe HTML embedding
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const safePreviousPlan = esc(previousPlan);
  const safeNewPlan = esc(newPlan);

  // Use tier-specific welcome email for upgrades to PRO or ELITE
  const tierKey = newPlan.toUpperCase();
  const isUpgradeWithWelcome = isUpgrade && (tierKey === "PRO" || tierKey === "ELITE");
  const features = PLAN_WELCOME_FEATURES[tierKey] ?? [];

  const subject = isUpgradeWithWelcome
    ? `Welcome to AlgoStudio ${safeNewPlan}!`
    : `Your AlgoStudio plan has been changed to ${safeNewPlan}`;

  const featuresHtml = features
    .map(
      (f) =>
        `<li style="padding: 4px 0; color: #ffffff;"><span style="color: #10B981; margin-right: 8px;">&#10003;</span>${esc(f)}</li>`
    )
    .join("");

  const upgradeBody = `
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0;">Welcome to ${safeNewPlan}!</h1>
            <p style="margin: 0 0 24px 0; line-height: 1.6; color: #ffffff;">
              Thank you for upgrading. Your ${safeNewPlan} plan is now active and all features are unlocked.
            </p>
            <h2 style="color: #ffffff; font-size: 16px; margin: 0 0 12px 0;">Your ${safeNewPlan} features</h2>
            <ul style="margin: 0 0 24px 0; padding-left: 0; list-style: none; line-height: 1.8; color: #ffffff;">
              ${featuresHtml}
            </ul>
            <a href="${settingsUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              Open AlgoStudio
            </a>
            <p style="margin: 0; font-size: 14px; color: #CBD5E1;">
              Questions? Contact us at ${SUPPORT_EMAIL}.
            </p>`;

  const downgradeBody = `
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Plan changed</h1>
            <p style="margin: 0 0 16px 0; line-height: 1.6; color: #ffffff;">
              Your plan has been changed from <strong style="color: #ffffff;">${safePreviousPlan}</strong> to <strong style="color: #ffffff;">${safeNewPlan}</strong>.
            </p>
            <p style="margin: 0 0 24px 0; line-height: 1.6; color: #ffffff;">Your new plan takes effect at the end of your current billing period.</p>
            <a href="${settingsUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              Go to Dashboard
            </a>
            <p style="margin: 0; font-size: 14px; color: #CBD5E1;">
              Questions? Contact us at ${SUPPORT_EMAIL}.
            </p>`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #ffffff; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            ${isUpgradeWithWelcome ? upgradeBody : downgradeBody}
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    log.error({ error, to: email.substring(0, 3) + "***" }, "Failed to send plan change email");
  } else {
    log.info({ to: email.substring(0, 3) + "***" }, "Plan change email sent");
  }
}

export async function sendPaymentActionRequiredEmail(email: string, portalUrl: string) {
  if (!resend) {
    log.warn("Email not configured - skipping payment action required email");
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Action required - Complete your payment",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #ffffff; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Payment requires action</h1>
            <p style="margin: 0 0 16px 0; line-height: 1.6; color: #ffffff;">
              Your bank requires additional verification (e.g. 3D Secure) to complete your AlgoStudio payment.
            </p>
            <p style="margin: 0 0 24px 0; line-height: 1.6; color: #ffffff;">
              Please complete the verification to activate your subscription.
            </p>
            <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              Complete Payment
            </a>
            <p style="margin: 0; font-size: 14px; color: #CBD5E1;">
              Questions? Contact us at ${SUPPORT_EMAIL}.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    log.error(
      { error, to: email.substring(0, 3) + "***" },
      "Failed to send payment action required email"
    );
  } else {
    log.info({ to: email.substring(0, 3) + "***" }, "Payment action required email sent");
  }
}

export async function sendNewUserNotificationEmail(
  userEmail: string,
  provider: "credentials" | "google" | "github" | "discord"
) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    log.warn("ADMIN_EMAIL not configured - skipping new user notification");
    return;
  }
  if (!resend) {
    log.warn("Email not configured - skipping new user notification");
    return;
  }

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const safeEmail = esc(userEmail);

  const providerLabel =
    provider === "credentials"
      ? "Email &amp; password"
      : provider === "google"
        ? "Google OAuth"
        : "GitHub OAuth";

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: adminEmail,
    subject: `[AlgoStudio] New user signup: ${userEmail}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #ffffff; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">New user registered</h1>
            <table style="width: 100%; margin: 0 0 24px 0; font-size: 14px;">
              <tr><td style="padding: 6px 0; color: #E2E8F0; width: 80px;">Email:</td><td style="padding: 6px 0;"><a href="mailto:${safeEmail}" style="color: #A78BFA;">${safeEmail}</a></td></tr>
              <tr><td style="padding: 6px 0; color: #E2E8F0;">Method:</td><td style="padding: 6px 0; color: #ffffff;">${providerLabel}</td></tr>
              <tr><td style="padding: 6px 0; color: #E2E8F0;">Time:</td><td style="padding: 6px 0; color: #ffffff;">${new Date().toUTCString()}</td></tr>
            </table>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    log.error({ error }, "Failed to send new user notification email");
  } else {
    log.info(
      { userEmail: userEmail.substring(0, 3) + "***" },
      "New user notification email sent to admin"
    );
  }
}

export async function sendTrialEndingEmail(email: string, tier: string, portalUrl: string) {
  if (!resend) {
    log.warn("Email not configured - skipping trial ending email");
    return;
  }

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const safeTier = esc(tier);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your AlgoStudio trial ends in 3 days",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #ffffff; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Your trial ends soon</h1>
            <p style="margin: 0 0 16px 0; line-height: 1.6; color: #ffffff;">
              Your AlgoStudio ${safeTier} trial will end in 3 days. After that, your subscription will automatically begin and your payment method will be charged.
            </p>
            <p style="margin: 0 0 24px 0; line-height: 1.6; color: #ffffff;">
              If you&apos;d like to continue, no action is needed — your ${safeTier} plan will activate automatically. If you&apos;d like to cancel, you can do so from your account settings before the trial ends.
            </p>
            <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              Manage Subscription
            </a>
            <p style="margin: 0; font-size: 14px; color: #CBD5E1;">
              Questions? Contact us at ${SUPPORT_EMAIL}.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    log.error({ error, to: email.substring(0, 3) + "***" }, "Failed to send trial ending email");
  } else {
    log.info({ to: email.substring(0, 3) + "***" }, "Trial ending email sent");
  }
}

export async function sendRenewalReminderEmail(
  email: string,
  tier: string,
  amountDue: number,
  portalUrl: string
) {
  if (!resend) {
    log.warn("Email not configured - skipping renewal reminder email");
    return;
  }

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const safeTier = esc(tier);
  const formattedAmount = (amountDue / 100).toFixed(2);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Your AlgoStudio ${safeTier} subscription renews soon`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #ffffff; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Subscription renewal</h1>
            <p style="margin: 0 0 16px 0; line-height: 1.6; color: #ffffff;">
              Your AlgoStudio ${safeTier} subscription will renew soon. Your payment method will be charged <strong style="color: #ffffff;">$${formattedAmount}</strong>.
            </p>
            <p style="margin: 0 0 24px 0; line-height: 1.6; color: #ffffff;">
              No action is needed if you&apos;d like to continue. To update your payment method or cancel, visit your account settings.
            </p>
            <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              Manage Subscription
            </a>
            <p style="margin: 0; font-size: 14px; color: #CBD5E1;">
              Questions? Contact us at ${SUPPORT_EMAIL}.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    log.error(
      { error, to: email.substring(0, 3) + "***" },
      "Failed to send renewal reminder email"
    );
  } else {
    log.info({ to: email.substring(0, 3) + "***" }, "Renewal reminder email sent");
  }
}

export async function sendAdminDailyReportEmail(
  adminEmail: string,
  stats: {
    totalUsers: number;
    newUsersToday: number;
    newUsersWeek: number;
    proUsers: number;
    eliteUsers: number;
    mrr: number;
    exportsToday: number;
    exportsDone: number;
    exportsFailed: number;
    churnRiskCount: number;
    onlineEAs: number;
  }
) {
  if (!resend) {
    log.warn("Email not configured - skipping admin daily report");
    return;
  }

  const date = new Date().toISOString().split("T")[0];
  const successRate =
    stats.exportsToday > 0 ? ((stats.exportsDone / stats.exportsToday) * 100).toFixed(1) : "100.0";

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: adminEmail,
    subject: `[AlgoStudio] Daily Report - ${date}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #ffffff; padding: 40px 20px;">
          <div style="max-width: 520px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0;">Daily Admin Report</h1>
            <p style="color: #94A3B8; font-size: 14px; margin: 0 0 24px 0;">${date}</p>

            <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px 0;">
              <tr>
                <td style="padding: 12px; border: 1px solid rgba(79,70,229,0.2); border-radius: 8px;">
                  <div style="color: #94A3B8; font-size: 12px;">Total Users</div>
                  <div style="color: #ffffff; font-size: 24px; font-weight: 700;">${stats.totalUsers.toLocaleString()}</div>
                </td>
                <td style="padding: 12px; border: 1px solid rgba(79,70,229,0.2); border-radius: 8px;">
                  <div style="color: #94A3B8; font-size: 12px;">New Today</div>
                  <div style="color: #22D3EE; font-size: 24px; font-weight: 700;">${stats.newUsersToday}</div>
                </td>
                <td style="padding: 12px; border: 1px solid rgba(79,70,229,0.2); border-radius: 8px;">
                  <div style="color: #94A3B8; font-size: 12px;">New This Week</div>
                  <div style="color: #22D3EE; font-size: 24px; font-weight: 700;">${stats.newUsersWeek}</div>
                </td>
              </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px 0;">
              <tr>
                <td style="padding: 12px; border: 1px solid rgba(79,70,229,0.2); border-radius: 8px;">
                  <div style="color: #94A3B8; font-size: 12px;">MRR</div>
                  <div style="color: #10B981; font-size: 24px; font-weight: 700;">&euro;${stats.mrr.toLocaleString()}</div>
                </td>
                <td style="padding: 12px; border: 1px solid rgba(79,70,229,0.2); border-radius: 8px;">
                  <div style="color: #94A3B8; font-size: 12px;">PRO</div>
                  <div style="color: #4F46E5; font-size: 24px; font-weight: 700;">${stats.proUsers}</div>
                </td>
                <td style="padding: 12px; border: 1px solid rgba(79,70,229,0.2); border-radius: 8px;">
                  <div style="color: #94A3B8; font-size: 12px;">ELITE</div>
                  <div style="color: #A78BFA; font-size: 24px; font-weight: 700;">${stats.eliteUsers}</div>
                </td>
              </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px 0;">
              <tr>
                <td style="padding: 12px; border: 1px solid rgba(79,70,229,0.2); border-radius: 8px;">
                  <div style="color: #94A3B8; font-size: 12px;">Exports Today</div>
                  <div style="color: #ffffff; font-size: 24px; font-weight: 700;">${stats.exportsToday}</div>
                  <div style="color: #94A3B8; font-size: 11px;">${successRate}% success</div>
                </td>
                <td style="padding: 12px; border: 1px solid rgba(79,70,229,0.2); border-radius: 8px;">
                  <div style="color: #94A3B8; font-size: 12px;">Failed</div>
                  <div style="color: ${stats.exportsFailed > 0 ? "#EF4444" : "#10B981"}; font-size: 24px; font-weight: 700;">${stats.exportsFailed}</div>
                </td>
              </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px 0;">
              <tr>
                <td style="padding: 12px; border: 1px solid rgba(79,70,229,0.2); border-radius: 8px;">
                  <div style="color: #94A3B8; font-size: 12px;">Churn Risk</div>
                  <div style="color: ${stats.churnRiskCount > 0 ? "#F59E0B" : "#10B981"}; font-size: 24px; font-weight: 700;">${stats.churnRiskCount}</div>
                </td>
                <td style="padding: 12px; border: 1px solid rgba(79,70,229,0.2); border-radius: 8px;">
                  <div style="color: #94A3B8; font-size: 12px;">Online EAs</div>
                  <div style="color: #10B981; font-size: 24px; font-weight: 700;">${stats.onlineEAs}</div>
                </td>
              </tr>
            </table>

            <p style="color: #64748B; font-size: 12px; margin: 0; text-align: center;">
              Sent automatically by AlgoStudio at 08:00 UTC
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    log.error({ error }, "Failed to send admin daily report email");
    throw new Error("Failed to send admin report email");
  }

  log.info("Admin daily report email sent");
}

export async function sendBulkAdminEmail(email: string, subject: string, htmlMessage: string) {
  if (!resend) {
    log.warn("Email not configured - skipping bulk admin email");
    return;
  }

  // Escape user-provided content for safe HTML embedding
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const safeMessage = esc(htmlMessage).replace(/\n/g, "<br>");

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #ffffff; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <div style="line-height: 1.6; color: #ffffff;">
              ${safeMessage}
            </div>
            <hr style="border: none; border-top: 1px solid rgba(79, 70, 229, 0.2); margin: 24px 0;" />
            <p style="margin: 0; font-size: 12px; color: #64748B; text-align: center;">
              Sent by AlgoStudio
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    log.error({ error, to: email.substring(0, 3) + "***" }, "Failed to send bulk admin email");
    throw new Error("Failed to send email");
  }
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
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0F0A1A; color: #ffffff; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1A0626; border-radius: 12px; padding: 40px; border: 1px solid rgba(79, 70, 229, 0.2);">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 24px 0;">Payment failed</h1>
            <p style="margin: 0 0 16px 0; line-height: 1.6; color: #ffffff;">
              We were unable to process your latest payment for your AlgoStudio subscription.
            </p>
            <p style="margin: 0 0 24px 0; line-height: 1.6; color: #ffffff;">
              Please update your payment method to keep your subscription active. If payment is not resolved, your account will be downgraded to the Free plan.
            </p>
            <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 0 0 24px 0;">
              Update Payment Method
            </a>
            <p style="margin: 0; font-size: 14px; color: #CBD5E1;">
              If you believe this is an error, please contact us at ${SUPPORT_EMAIL}.
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
