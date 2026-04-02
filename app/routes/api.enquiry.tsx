import { type ActionFunctionArgs, json } from "@remix-run/node";
import nodemailer from "nodemailer";
import { prisma } from "../db.server";

// CORS headers for storefront requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const loader = async () => {
  // Handle OPTIONS preflight
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return json(
      { success: false, error: "Method not allowed" },
      { status: 405, headers: corsHeaders }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json(
      { success: false, error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders }
    );
  }

  const {
    shop,
    productId,
    productHandle,
    productTitle,
    quantity,
    name,
    email,
    phone,
    comments,
  } = body;

  // Validation
  const errors: string[] = [];
  if (!shop) errors.push("shop is required");
  if (!name || name.trim().length < 2) errors.push("name must be at least 2 characters");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("valid email is required");

  if (errors.length > 0) {
    return json(
      { success: false, error: errors.join(", ") },
      { status: 422, headers: corsHeaders }
    );
  }

  try {
    // Save enquiry to database
    const enquiry = await prisma.enquiry.create({
      data: {
        shop,
        productId: productId ? String(productId) : null,
        productHandle: productHandle || null,
        productTitle: productTitle || null,
        quantity: quantity ? parseInt(quantity, 10) : null,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        comments: comments?.trim() || null,
        status: "new",
      },
    });

    // Fetch settings and send notification email
    const settings = await prisma.settings.findUnique({ where: { shop } });

    if (
      settings?.notificationEmail &&
      settings.smtpHost &&
      settings.smtpUser &&
      settings.smtpPassword
    ) {
      try {
        const transporter = nodemailer.createTransport({
          host: settings.smtpHost,
          port: settings.smtpPort || 587,
          secure: (settings.smtpPort || 587) === 465,
          auth: {
            user: settings.smtpUser,
            pass: settings.smtpPassword,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });

        const productLine = productTitle
          ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Product</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${productTitle}${productId ? ` (ID: ${productId})` : productHandle ? ` (${productHandle})` : ""}</td></tr>`
          : "";

        const quantityLine = quantity
          ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Quantity</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${quantity}</td></tr>`
          : "";

        const phoneLine = phone
          ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${phone}</td></tr>`
          : "";

        const commentsLine = comments
          ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Comments</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${comments.replace(/\n/g, "<br>")}</td></tr>`
          : "";

        await transporter.sendMail({
          from: `"Enquiry Modal" <${settings.smtpUser}>`,
          to: settings.notificationEmail,
          subject: `New Product Enquiry from ${name} — ${shop}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #5c6ac4; padding: 24px; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">New Product Enquiry</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">${shop}</p>
              </div>
              <div style="background: white; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td></tr>
                  ${phoneLine}
                  ${productLine}
                  ${quantityLine}
                  ${commentsLine}
                  <tr><td style="padding: 8px;"><strong>Submitted</strong></td><td style="padding: 8px;">${new Date(enquiry.createdAt).toLocaleString()}</td></tr>
                </table>
              </div>
              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 16px;">
                Sent by Enquiry Modal App · Enquiry ID: ${enquiry.id}
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        // Email failure should not prevent the enquiry from being saved
        console.error("Failed to send notification email:", emailError);
      }
    }

    return json(
      { success: true, enquiryId: enquiry.id },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error saving enquiry:", error);
    return json(
      { success: false, error: "Failed to save enquiry. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
};
