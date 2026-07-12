import { NextResponse, type NextRequest } from "next/server";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("webhooks/polar");

export async function POST(request: NextRequest) {
  const body = await request.text();
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

  if (!webhookSecret) {
    log.error("POLAR_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  try {
    const event = validateEvent(
      body,
      Object.fromEntries(request.headers.entries()),
      webhookSecret,
    );

    switch (event.type) {
      case "checkout.created":
        log.info({ checkoutId: event.data.id }, "Checkout created");
        break;
      case "checkout.updated":
        log.info(
          { checkoutId: event.data.id, status: event.data.status },
          "Checkout updated",
        );
        break;
      case "subscription.created":
        log.info(
          { subscriptionId: event.data.id },
          "Subscription created",
        );
        break;
      case "subscription.updated":
        log.info(
          { subscriptionId: event.data.id, status: event.data.status },
          "Subscription updated",
        );
        break;
      default:
        log.info({ type: event.type }, "Unhandled webhook event");
    }

    return NextResponse.json({ received: true }, { status: 202 });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      log.warn("Invalid Polar webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 },
      );
    }
    throw error;
  }
}
