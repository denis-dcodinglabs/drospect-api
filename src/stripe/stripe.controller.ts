import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
  Headers,
} from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "src/authentication/auth.guard";
import { getSubIdFromToken } from "src/decodedToken/getSubIdFromToken";
import { PaymentService } from "src/payment/payment.service";
import { WalletService } from "src/wallet/wallet.service";
import Stripe from "stripe";
import { AppLogger } from "../common/logger/logger.service";

@Controller("/stripe")
export class PaymentController {
  private readonly logger = new AppLogger();
  private stripe: Stripe;
  private YOUR_DOMAIN = process.env.REACT_APP_BASEURL;

  constructor(
    private paymentService: PaymentService,
    private walletService: WalletService,
  ) {
    const rawKey = process.env.STRIPE_SERVER_SECRET_KEY;
    if (!rawKey) {
      throw new Error("STRIPE_SERVER_SECRET_KEY is not defined");
    }
    const cleanKey = rawKey.trim().replace(/^['"]|['"]$/g, ""); // remove surrounding quotes
    this.stripe = new Stripe(cleanKey);
  }

  @Post("webhook")
  async handleWebhook(
    @Req() request: any,
    @Headers("stripe-signature") sig: string,
    @Res() res: Response,
  ) {
    // const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const endpointSecret = "whsec_84QJLS0ph43BLLms34ugHfv8TrzmMTVH";

    if (!endpointSecret) {
      this.logger.warn("STRIPE_WEBHOOK_SECRET not configured", {
        service: "stripe",
        method: "handleWebhook",
      });
      return res.status(400).send("Webhook secret not configured");
    }

    let event: Stripe.Event;
    let payload: string | Buffer;

    try {
      // Get the raw body - handle both rawBody and body
      payload = request.rawBody || request.body || request;

      if (!payload) {
        this.logger.warn("No webhook payload received", {
          service: "stripe",
          method: "handleWebhook",
        });
        return res.status(400).send("No webhook payload was provided");
      }

      // If payload is already a string, use it directly, otherwise convert buffer to string
      const payloadString =
        typeof payload === "string" ? payload : payload.toString();

      this.logger.debug(
        `Webhook payload received, length: ${payloadString.length}`,
        { service: "stripe", method: "handleWebhook" },
      );
      this.logger.debug(`Signature: ${sig ? "Present" : "Missing"}`, {
        service: "stripe",
        method: "handleWebhook",
      });

      // Verify webhook signature
      event = this.stripe.webhooks.constructEvent(
        payloadString,
        sig,
        endpointSecret,
      );

      this.logger.info(
        `Webhook signature verified, event type: ${event.type}`,
        { service: "stripe", method: "handleWebhook", eventType: event.type },
      );
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
        err,
        { service: "stripe", method: "handleWebhook" },
      );
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout session completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      this.logger.logPaymentEvent("Payment succeeded via webhook", undefined, {
        sessionId: session.id,
      });

      // Extract payment ID from metadata
      const paymentId = session.metadata?.paymentId;

      if (paymentId) {
        await this.processWebhookPayment(paymentId);
      } else {
        this.logger.warn("No payment ID found in session metadata", {
          service: "stripe",
          method: "handleWebhook",
          sessionId: session.id,
        });
      }
    }

    res.json({ received: true });
  }

  private async processWebhookPayment(paymentId: string) {
    try {
      // Get the payment record
      const payment = await this.paymentService.findOne(paymentId);

      if (!payment) {
        this.logger.error(`Payment record not found: ${paymentId}`, undefined, {
          service: "stripe",
          method: "processWebhookPayment",
          paymentId,
        });
        return;
      }

      // Check if already processed to avoid duplicates
      if (payment.status === "success") {
        this.logger.info(`Payment already processed: ${paymentId}`, {
          service: "stripe",
          method: "processWebhookPayment",
          paymentId,
        });
        return;
      }

      // Update payment status
      await this.paymentService.update(paymentId, {
        status: "success",
      });

      // Award credits to user's wallet
      await this.walletService.updateByUserId(payment.userId, {
        credits: payment.credits,
      });

      this.logger.logPaymentEvent(
        `Webhook awarded ${payment.credits} credits to user ${payment.userId}`,
        payment.credits,
        {
          service: "stripe",
          method: "processWebhookPayment",
          paymentId,
          userId: payment.userId,
        },
      );
    } catch (error) {
      this.logger.error("Error processing webhook payment", error, {
        service: "stripe",
        method: "processWebhookPayment",
        paymentId,
      });
    }
  }

  @Post("create-checkout-session")
  async createCheckoutSession(
    @Body("price") price: number,
    @Body("name") name: string,
    @Body("description") description: string,
    @Body("paymentId") paymentId: string,
    @Res() res: Response,
  ) {
    try {
      // Validate price
      if (!price || isNaN(price) || price <= 0) {
        return res.status(400).send({ error: "Invalid price value" });
      }

      // Convert price to cents and ensure it's an integer
      const unitAmount = Math.round(price * 100);

      const session = await this.stripe.checkout.sessions.create({
        ui_mode: "embedded",
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: name,
                description: description,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        return_url: `${this.YOUR_DOMAIN}admin/return?success=true&session_id={CHECKOUT_SESSION_ID}&payment_id=${paymentId}`,
        // Add payment ID to metadata for webhook processing
        metadata: {
          paymentId: paymentId,
        },
      });

      res.send({ clientSecret: session.client_secret });
    } catch (error) {
      console.error(
        "Error creating Stripe session:",
        error.message,
        error,
        process.env.STRIPE_SERVER_SECRET_KEY,
      );
      res.status(500).send("Error creating Stripe session");
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post("verify-payment")
  async verifyPayment(
    @Req() request: Request,
    @Body() body: { sessionId: string; paymentId: string },
  ) {
    const authorizationHeader = request.headers["authorization"];
    const subId = getSubIdFromToken(authorizationHeader);

    // Retrieve the session from Stripe
    const session = await this.stripe.checkout.sessions.retrieve(
      body.sessionId,
    );

    if (session.payment_status === "paid") {
      // Get the payment record
      const payment = await this.paymentService.findOne(body.paymentId);

      if (!payment) {
        return { success: false, error: "Payment record not found" };
      }

      // Update payment status
      await this.paymentService.update(body.paymentId, {
        status: "success",
      });

      // Update wallet with the credits from the payment
      const wallet = await this.walletService.updateByUserId(subId, {
        credits: payment.credits,
      });

      return { success: true, session, payment, wallet };
    } else {
      // Update payment status to failed
      await this.paymentService.update(body.paymentId, {
        status: "failed",
      });

      return { success: false, session };
    }
  }
}
