import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  json,
} from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  BlockStack,
  Text,
  Banner,
  Divider,
  Box,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { useState, useCallback } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const settings = await prisma.settings.findUnique({ where: { shop } });

  return json({
    settings: settings
      ? {
          notificationEmail: settings.notificationEmail || "",
          smtpHost: settings.smtpHost || "",
          smtpPort: settings.smtpPort?.toString() || "",
          smtpUser: settings.smtpUser || "",
          smtpPassword: settings.smtpPassword || "",
          gtagCode: settings.gtagCode || "",
        }
      : {
          notificationEmail: "",
          smtpHost: "",
          smtpPort: "",
          smtpUser: "",
          smtpPassword: "",
          gtagCode: "",
        },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();

  const notificationEmail = formData.get("notificationEmail") as string;
  const smtpHost = formData.get("smtpHost") as string;
  const smtpPortStr = formData.get("smtpPort") as string;
  const smtpUser = formData.get("smtpUser") as string;
  const smtpPassword = formData.get("smtpPassword") as string;
  const gtagCode = formData.get("gtagCode") as string;

  const smtpPort = smtpPortStr ? parseInt(smtpPortStr, 10) : null;

  try {
    await prisma.settings.upsert({
      where: { shop },
      update: {
        notificationEmail: notificationEmail || null,
        smtpHost: smtpHost || null,
        smtpPort: smtpPort,
        smtpUser: smtpUser || null,
        smtpPassword: smtpPassword || null,
        gtagCode: gtagCode || null,
      },
      create: {
        shop,
        notificationEmail: notificationEmail || null,
        smtpHost: smtpHost || null,
        smtpPort: smtpPort,
        smtpUser: smtpUser || null,
        smtpPassword: smtpPassword || null,
        gtagCode: gtagCode || null,
      },
    });

    return json({ success: true, error: null });
  } catch (error) {
    return json({ success: false, error: "Failed to save settings. Please try again." });
  }
};

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [notificationEmail, setNotificationEmail] = useState(
    settings.notificationEmail
  );
  const [smtpHost, setSmtpHost] = useState(settings.smtpHost);
  const [smtpPort, setSmtpPort] = useState(settings.smtpPort);
  const [smtpUser, setSmtpUser] = useState(settings.smtpUser);
  const [smtpPassword, setSmtpPassword] = useState(settings.smtpPassword);
  const [gtagCode, setGtagCode] = useState(settings.gtagCode);

  const handleNotificationEmail = useCallback(
    (value: string) => setNotificationEmail(value),
    []
  );
  const handleSmtpHost = useCallback((value: string) => setSmtpHost(value), []);
  const handleSmtpPort = useCallback((value: string) => setSmtpPort(value), []);
  const handleSmtpUser = useCallback((value: string) => setSmtpUser(value), []);
  const handleSmtpPassword = useCallback(
    (value: string) => setSmtpPassword(value),
    []
  );
  const handleGtagCode = useCallback((value: string) => setGtagCode(value), []);

  return (
    <Page title="Settings" subtitle="Configure your Enquiry Modal app">
      <Layout>
        <Layout.Section>
          {actionData?.success && (
            <Banner tone="success" title="Settings saved successfully!" />
          )}
          {actionData?.error && (
            <Banner tone="critical" title="Error saving settings">
              <Text as="p">{actionData.error}</Text>
            </Banner>
          )}
        </Layout.Section>

        <Layout.Section>
          <Form method="post">
            <BlockStack gap="500">
              {/* Notification Settings */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Notification Settings
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Configure where enquiry notifications are sent.
                  </Text>
                  <FormLayout>
                    <TextField
                      label="Notification Email"
                      name="notificationEmail"
                      type="email"
                      value={notificationEmail}
                      onChange={handleNotificationEmail}
                      placeholder="enquiries@yourstore.com"
                      helpText="All new enquiries will be forwarded to this email address."
                      autoComplete="email"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* SMTP Settings */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    SMTP Email Settings
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Configure your SMTP server for sending enquiry notification
                    emails. Leave blank to disable email notifications.
                  </Text>
                  <FormLayout>
                    <FormLayout.Group>
                      <TextField
                        label="SMTP Host"
                        name="smtpHost"
                        value={smtpHost}
                        onChange={handleSmtpHost}
                        placeholder="smtp.gmail.com"
                        autoComplete="off"
                      />
                      <TextField
                        label="SMTP Port"
                        name="smtpPort"
                        type="number"
                        value={smtpPort}
                        onChange={handleSmtpPort}
                        placeholder="587"
                        autoComplete="off"
                      />
                    </FormLayout.Group>
                    <FormLayout.Group>
                      <TextField
                        label="SMTP Username"
                        name="smtpUser"
                        value={smtpUser}
                        onChange={handleSmtpUser}
                        placeholder="your@email.com"
                        autoComplete="off"
                      />
                      <TextField
                        label="SMTP Password"
                        name="smtpPassword"
                        type="password"
                        value={smtpPassword}
                        onChange={handleSmtpPassword}
                        placeholder="••••••••"
                        autoComplete="off"
                      />
                    </FormLayout.Group>
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* GTag / Tracking Settings */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Conversion Tracking (GTag / Analytics)
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Enter raw JavaScript or a gtag event call to execute when a
                    customer successfully submits an enquiry. This code runs in the
                    storefront context.
                  </Text>
                  <FormLayout>
                    <TextField
                      label="GTag / Analytics Code"
                      name="gtagCode"
                      value={gtagCode}
                      onChange={handleGtagCode}
                      multiline={5}
                      placeholder={`gtag('event', 'enquiry_submitted', {\n  event_category: 'engagement',\n  event_label: 'product_enquiry'\n});`}
                      helpText="This JavaScript snippet will be executed on the storefront after a successful enquiry submission."
                      autoComplete="off"
                      monospaced
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              <Box>
                <InlineStack align="end">
                  <Button
                    variant="primary"
                    submit
                    loading={isSubmitting}
                    size="large"
                  >
                    {isSubmitting ? "Saving…" : "Save Settings"}
                  </Button>
                </InlineStack>
              </Box>
            </BlockStack>
          </Form>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Help
              </Text>
              <Divider />
              <BlockStack gap="300">
                <Text variant="bodyMd" as="p" fontWeight="semibold">
                  Setting up Email Notifications
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  For Gmail, use smtp.gmail.com on port 587 with your Gmail
                  address and an App Password (not your regular password). Enable
                  2FA on your Google account first, then generate an App Password.
                </Text>
              </BlockStack>
              <Divider />
              <BlockStack gap="300">
                <Text variant="bodyMd" as="p" fontWeight="semibold">
                  Adding the Enquiry Button
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  Add{" "}
                  <code>data-enquiry-trigger</code> to any element in your theme
                  to make it open the enquiry modal. Use{" "}
                  <code>data-enquiry-trigger="product-handle"</code> to
                  pre-fill a specific product.
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
