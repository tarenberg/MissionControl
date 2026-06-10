/**
 * GitHub Webhook Endpoint
 * Receives and processes GitHub webhook events
 */

import { NextRequest, NextResponse } from 'next/server';
import { webhookHandler, WebhookPayload } from '@/lib/github/webhook-handler';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Get webhook signature and event type
    const signature = request.headers.get('x-hub-signature-256');
    const eventType = request.headers.get('x-github-event');

    if (!signature || !eventType) {
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    // Parse payload
    const payload: WebhookPayload = await request.json();
    const payloadString = JSON.stringify(payload);

    // Find project by repository
    const repoOwner = payload.repository.owner.login;
    const repoName = payload.repository.name;

    const webhookConfig = await prisma.githubWebhookConfig.findFirst({
      where: {
        repoOwner,
        repoName,
        enabled: true,
      },
      include: {
        project: true,
      },
    });

    if (!webhookConfig) {
      return NextResponse.json(
        { error: 'No webhook configuration found for this repository' },
        { status: 404 }
      );
    }

    // Verify signature (if secret is configured)
    if (webhookConfig.webhookSecret) {
      const isValid = webhookHandler.verifySignature(
        payloadString,
        signature,
        webhookConfig.webhookSecret
      );

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Handle the webhook event
    const result = await webhookHandler.handleWebhook(
      eventType,
      payload,
      webhookConfig.projectId
    );

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
