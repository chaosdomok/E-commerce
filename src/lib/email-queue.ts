import { prisma } from '@/lib/prisma';
import { sendEmail, type EmailOptions } from '@/lib/email';

export interface QueuedEmailOptions extends EmailOptions {
  priority?: number;
  scheduledAt?: Date;
}

const RATE_LIMIT_DELAY_MS = 2000; // 2 seconds between emails to avoid rate limiting
const MAX_RETRIES = 3;
const BATCH_SIZE = 5;

/**
 * Add email to queue for later processing
 */
export async function queueEmail(options: QueuedEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const queuedEmail = await prisma.emailQueue.create({
      data: {
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        priority: options.priority || 0,
        scheduledAt: options.scheduledAt || new Date(),
      },
    });

    return { success: true, id: queuedEmail.id };
  } catch (error) {
    console.error('[EMAIL_QUEUE_ERROR]', error);
    return { success: false, error: 'Failed to queue email' };
  }
}

/**
 * Process queued emails with rate limiting
 */
export async function processEmailQueue(): Promise<{ processed: number; failed: number }> {
  const now = new Date();
  let processed = 0;
  let failed = 0;

  try {
    // Get pending emails ordered by priority and scheduled time
    const pendingEmails = await prisma.emailQueue.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: now },
        attempts: { lt: MAX_RETRIES },
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledAt: 'asc' },
      ],
      take: BATCH_SIZE,
    });

    for (const email of pendingEmails) {
      try {
        // Mark as processing
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: { status: 'PROCESSING' },
        });

        // Send the email
        const result = await sendEmail({
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });

        if (result.success) {
          await prisma.emailQueue.update({
            where: { id: email.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          });
          processed++;
        } else {
          await prisma.emailQueue.update({
            where: { id: email.id },
            data: {
              status: 'FAILED',
              attempts: { increment: 1 },
              lastError: result.error || 'Unknown error',
            },
          });
          failed++;
        }

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      } catch (error) {
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            status: 'FAILED',
            attempts: { increment: 1 },
            lastError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        failed++;
      }
    }
  } catch (error) {
    console.error('[EMAIL_QUEUE_PROCESS_ERROR]', error);
  }

  return { processed, failed };
}

/**
 * Clean up old sent emails (older than 30 days)
 */
export async function cleanupEmailQueue(): Promise<{ deleted: number }> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await prisma.emailQueue.deleteMany({
    where: {
      status: 'SENT',
      sentAt: { lte: thirtyDaysAgo },
    },
  });

  return { deleted: result.count };
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [pending, processing, sent, failed] = await Promise.all([
    prisma.emailQueue.count({ where: { status: 'PENDING' } }),
    prisma.emailQueue.count({ where: { status: 'PROCESSING' } }),
    prisma.emailQueue.count({ where: { status: 'SENT' } }),
    prisma.emailQueue.count({ where: { status: 'FAILED' } }),
  ]);

  return { pending, processing, sent, failed };
}
