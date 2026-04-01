import { type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Box,
  Badge,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [totalEnquiries, newEnquiries, recentEnquiries] = await Promise.all([
    prisma.enquiry.count({ where: { shop } }),
    prisma.enquiry.count({ where: { shop, status: "new" } }),
    prisma.enquiry.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        productTitle: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    totalEnquiries,
    newEnquiries,
    recentEnquiries: recentEnquiries.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
  };
};

export default function Index() {
  const { totalEnquiries, newEnquiries, recentEnquiries } =
    useLoaderData<typeof loader>();

  return (
    <Page title="Enquiry Modal — Dashboard">
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <InlineStack gap="400">
              <Box
                background="bg-surface"
                padding="500"
                borderRadius="200"
                borderWidth="025"
                borderColor="border"
                minWidth="200px"
              >
                <BlockStack gap="200">
                  <Text variant="headingLg" as="h2">
                    {totalEnquiries}
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Total Enquiries
                  </Text>
                </BlockStack>
              </Box>
              <Box
                background="bg-surface"
                padding="500"
                borderRadius="200"
                borderWidth="025"
                borderColor="border"
                minWidth="200px"
              >
                <BlockStack gap="200">
                  <InlineStack gap="200" align="center">
                    <Text variant="headingLg" as="h2">
                      {newEnquiries}
                    </Text>
                    {newEnquiries > 0 && (
                      <Badge tone="attention">New</Badge>
                    )}
                  </InlineStack>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Unread Enquiries
                  </Text>
                </BlockStack>
              </Box>
            </InlineStack>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingMd" as="h2">
                    Recent Enquiries
                  </Text>
                  <Link to="/app/enquiries">
                    <Button variant="plain">View all</Button>
                  </Link>
                </InlineStack>

                {recentEnquiries.length === 0 ? (
                  <Box paddingBlock="400">
                    <Text variant="bodyMd" as="p" tone="subdued" alignment="center">
                      No enquiries yet. Once customers submit enquiries from your
                      storefront, they will appear here.
                    </Text>
                  </Box>
                ) : (
                  <BlockStack gap="300">
                    {recentEnquiries.map((enquiry, i) => (
                      <div key={enquiry.id}>
                        {i > 0 && <Divider />}
                        <Box paddingBlock="200">
                          <InlineStack align="space-between">
                            <BlockStack gap="100">
                              <Text variant="bodyMd" as="p" fontWeight="semibold">
                                {enquiry.name}
                              </Text>
                              <Text variant="bodySm" as="p" tone="subdued">
                                {enquiry.email}
                                {enquiry.productTitle
                                  ? ` · ${enquiry.productTitle}`
                                  : ""}
                              </Text>
                            </BlockStack>
                            <InlineStack gap="200" align="center">
                              <Badge
                                tone={
                                  enquiry.status === "new" ? "attention" : "success"
                                }
                              >
                                {enquiry.status === "new" ? "New" : "Reviewed"}
                              </Badge>
                              <Text variant="bodySm" as="p" tone="subdued">
                                {new Date(enquiry.createdAt).toLocaleDateString()}
                              </Text>
                            </InlineStack>
                          </InlineStack>
                        </Box>
                      </div>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Quick Links
                </Text>
                <InlineStack gap="300">
                  <Link to="/app/enquiries">
                    <Button>View All Enquiries</Button>
                  </Link>
                  <Link to="/app/settings">
                    <Button variant="plain">Configure Settings</Button>
                  </Link>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
