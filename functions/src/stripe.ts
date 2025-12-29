import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { PRODUCTS } from "../../shared/products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover" as any,
});

export const createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in");
  }

  const { productId } = data;
  const product = PRODUCTS.find((p) => p.id === productId);

  if (!product) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid product ID");
  }

  const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
  const userData = userDoc.data();
  const customerEmail = userData?.email || context.auth.token.email;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: product.currency,
            product_data: {
              name: product.name,
              description: product.description,
              images: [
                // Use absolute URL for images in production
                `https://barcodegames.manus.space${product.image}`
              ],
            },
            unit_amount: product.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${context.rawRequest.headers.origin}/shop?success=true`,
      cancel_url: `${context.rawRequest.headers.origin}/shop?canceled=true`,
      customer_email: customerEmail,
      client_reference_id: context.auth.uid,
      metadata: {
        userId: context.auth.uid,
        productId: product.id,
        productType: product.type,
        amount: product.amount.toString(),
      },
      allow_promotion_codes: true,
    });

    return { url: session.url };
  } catch (error) {
    console.error("Stripe checkout error:", error);
    throw new functions.https.HttpsError("internal", "Failed to create checkout session");
  }
});

export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (!sig || !endpointSecret) {
      throw new Error("Missing signature or webhook secret");
    }
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle test events
  if (event.id.startsWith('evt_test_')) {
    console.log("[Webhook] Test event detected, returning verification response");
    res.json({ verified: true });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    // const productId = session.metadata?.productId;
    const productType = session.metadata?.productType;
    const amount = Number(session.metadata?.amount);

    if (userId && productType === "coin" && amount) {
      try {
        await admin.firestore().runTransaction(async (transaction) => {
          const userRef = admin.firestore().collection("users").doc(userId);
          const userDoc = await transaction.get(userRef);

          if (!userDoc.exists) {
            throw new Error("User does not exist");
          }

          const currentCredits = userDoc.data()?.credits || 0;
          transaction.update(userRef, {
            credits: currentCredits + amount,
          });
        });
        console.log(`Added ${amount} coins to user ${userId}`);
      } catch (error) {
        console.error("Failed to fulfill order:", error);
        res.status(500).send("Failed to fulfill order");
        return;
      }
    }
  }

  res.json({ received: true });
});
