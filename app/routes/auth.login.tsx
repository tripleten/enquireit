import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import shopify from "../shopify.server";

type LoginErrors = Awaited<ReturnType<typeof shopify.login>>;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = await shopify.login(request);

  return json({ errors });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = await shopify.login(request);

  return json({ errors });
};

export default function AuthLogin() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = (actionData?.errors ?? loaderData.errors) as LoginErrors;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Login | EnquireIt</title>
      </head>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <main style={{ maxWidth: "28rem", margin: "0 auto" }}>
          <h1 style={{ marginBottom: "0.5rem" }}>Open EnquireIt</h1>
          <p style={{ marginBottom: "1rem", color: "#555" }}>
            Enter your Shopify store domain to continue.
          </p>
          <Form method="post">
            <label htmlFor="shop" style={{ display: "block", marginBottom: "0.5rem" }}>
              Shopify store domain
            </label>
            <input
              id="shop"
              name="shop"
              type="text"
              placeholder="your-store.myshopify.com"
              autoComplete="on"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ccc",
                borderRadius: "0.5rem",
                marginBottom: "0.75rem",
              }}
            />
            {errors?.shop ? (
              <p style={{ color: "#b42318", marginBottom: "0.75rem" }}>
                {errors.shop === "MISSING_SHOP"
                  ? "Store domain is required."
                  : "Enter a valid .myshopify.com store domain."}
              </p>
            ) : null}
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: 0,
                borderRadius: "0.5rem",
                background: "#111827",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Continue
            </button>
          </Form>
        </main>
      </body>
    </html>
  );
}
