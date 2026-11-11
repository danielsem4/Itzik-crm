/**
 * Email delivery.
 *
 * Behind an interface so the transport is swappable and services are testable
 * with a fake. In production, SMTP via nodemailer. In non-production (or when no
 * SMTP is configured) the message is written to the developer console — matching
 * the documented "emails are console.log'ged in dev" behavior.
 *
 * IMPORTANT: message bodies may contain one-time links, so they are
 * NEVER passed to the structured `logger`. The dev console output is the delivery
 * channel itself, used only in non-production.
 */
import nodemailer from "nodemailer";
import type { AppConfig } from "../../config";
import { logger } from "./logger";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface IEmailSender {
  send(message: EmailMessage): Promise<void>;
}

/** Non-production sender: prints to the console; never routes bodies through the logger. */
export class ConsoleEmailSender implements IEmailSender {
  async send(message: EmailMessage): Promise<void> {
    // Structured log records only non-secret envelope metadata.
    logger.info("email_console_delivery", { to: message.to, subject: message.subject });
    // eslint-disable-next-line no-console
    console.log(
      `\n----- DEV EMAIL (not sent) -----\n` +
        `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n` +
        `--------------------------------\n`
    );
  }
}

/** Production sender: SMTP via nodemailer. */
export class SmtpEmailSender implements IEmailSender {
  constructor(
    private readonly transport: nodemailer.Transporter,
    private readonly from: string
  ) {}

  async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    logger.info("email_sent", { to: message.to, subject: message.subject });
  }
}

/** Choose a sender from config: SMTP in production when configured, else console. */
export function createEmailSender(config: AppConfig): IEmailSender {
  if (config.isProduction && config.smtp) {
    const transport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user
        ? { user: config.smtp.user, pass: config.smtp.pass ?? "" }
        : undefined,
    });
    return new SmtpEmailSender(transport, config.smtp.user ?? "no-reply@localhost");
  }
  return new ConsoleEmailSender();
}
