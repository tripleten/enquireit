import { type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Text,
  Badge,
  Button,
  BlockStack,
  EmptyState,
  Box,
  Select,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") || "all";

  const whereClause: any = { shop };
  if (statusFilter !== "all") {
    whereClause.status = statusFilter;
  }

  const enquiries = await prisma.enquiry.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return {
    enquiries: enquiries.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
    statusFilter,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const enquiryId = formData.get("enquiryId") as string;
  const newStatus = formData.get("status") as string;

  if (enquiryId && newStatus) {
    await prisma.enquiry.updateMany({
      where: { id: enquiryId, shop },
      data: { status: newStatus },
    });
  }

  return { success: true };
};

export default function Enquiries() {
  const { enquiries, statusFilter } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [filter, setFilter] = useState(statusFilter);

  const handleStatusChange = (enquiryId: string, status: string) => {
    const formData = new FormData();
    formData.append("enquiryId", enquiryId);
    formData.append("status", status);
    fetcher.submit(formData, { method: "POST" });
  };

  const rows = enquiries.map((enquiry) => [
    new Date(enquiry.createdAt).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    enquiry.productTitle || enquiry.productHandle || "—",
    enquiry.name,
    enquiry.email,
    enquiry.phone || "—",
    enquiry.quantity?.toString() || "—",
    enquiry.comments
      ? enquiry.comments.length > 60
        ? enquiry.comments.substring(0, 60) + "…"
        : enquiry.comments
      : "—",
    <Badge
      key={enquiry.id + "-badge"}
      tone={enquiry.status === "new" ? "attention" : "success"}
    >
      {enquiry.status === "new" ? "New" : "Reviewed"}
    </Badge>,
    <Button
      key={enquiry.id + "-btn"}
      size="slim"
      onClick={() =>
        handleStatusChange(
          enquiry.id,
          enquiry.status === "new" ? "reviewed" : "new"
        )
      }
    >
      {enquiry.status === "new" ? "Mark Reviewed" : "Mark New"}
    </Button>,
  ]);

  return (
    <Page
      title="Enquiries"
      subtitle={`${enquiries.length} enquirie${enquiries.length !== 1 ? "s" : ""} found`}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Box maxWidth="200px">
                <Select
                  label="Filter by status"
                  options={[
                    { label: "All enquiries", value: "all" },
                    { label: "New", value: "new" },
                    { label: "Reviewed", value: "reviewed" },
                  ]}
                  value={filter}
                  onChange={(value) => {
                    setFilter(value);
                    window.location.href = `/app/enquiries?status=${value}`;
                  }}
                />
              </Box>

              {enquiries.length === 0 ? (
                <EmptyState
                  heading="No enquiries found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <Text as="p" variant="bodyMd">
                    {filter === "all"
                      ? "When customers submit enquiries from your storefront, they will appear here."
                      : `No enquiries with status "${filter}".`}
                  </Text>
                </EmptyState>
              ) : (
                <DataTable
                  columnContentTypes={[
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                    "numeric",
                    "text",
                    "text",
                    "text",
                  ]}
                  headings={[
                    "Date",
                    "Product",
                    "Name",
                    "Email",
                    "Phone",
                    "Qty",
                    "Comments",
                    "Status",
                    "Action",
                  ]}
                  rows={rows}
                  truncate
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
