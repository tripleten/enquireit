import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  json,
} from "@remix-run/node";
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
  InlineStack,
  Modal,
  Divider,
} from "@shopify/polaris";
import { useMemo, useState } from "react";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") || "all";

  const whereClause: { shop: string; status?: string } = { shop };
  if (statusFilter !== "all") {
    whereClause.status = statusFilter;
  }

  const enquiries = await prisma.enquiry.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return json({
    enquiries: enquiries.map((enquiry) => ({
      ...enquiry,
      createdAt: enquiry.createdAt.toISOString(),
    })),
    statusFilter,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const intent = formData.get("intent");
  const enquiryId = formData.get("enquiryId");

  if (typeof enquiryId !== "string" || !enquiryId) {
    return json({ success: false, error: "Missing enquiry id." }, { status: 400 });
  }

  if (intent === "delete") {
    await prisma.enquiry.deleteMany({
      where: { id: enquiryId, shop },
    });

    return json({ success: true });
  }

  const newStatus = formData.get("status");
  if (typeof newStatus === "string" && newStatus) {
    await prisma.enquiry.updateMany({
      where: { id: enquiryId, shop },
      data: { status: newStatus },
    });

    return json({ success: true });
  }

  return json({ success: false, error: "Invalid action." }, { status: 400 });
};

export default function Enquiries() {
  const { enquiries, statusFilter } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [filter, setFilter] = useState(statusFilter);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null);

  const selectedEnquiry = useMemo(
    () => enquiries.find((enquiry) => enquiry.id === selectedEnquiryId) ?? null,
    [enquiries, selectedEnquiryId],
  );

  const handleStatusChange = (enquiryId: string, status: string) => {
    const formData = new FormData();
    formData.append("intent", "update-status");
    formData.append("enquiryId", enquiryId);
    formData.append("status", status);
    fetcher.submit(formData, { method: "POST" });
  };

  const handleDelete = (enquiryId: string) => {
    if (!window.confirm("Delete this enquiry? This cannot be undone.")) {
      return;
    }

    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("enquiryId", enquiryId);
    fetcher.submit(formData, { method: "POST" });

    if (selectedEnquiryId === enquiryId) {
      setSelectedEnquiryId(null);
    }
  };

  const rows = enquiries.map((enquiry) => [
    new Date(enquiry.createdAt).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    enquiry.productTitle || "—",
    enquiry.name,
    enquiry.email,
    enquiry.phone || "—",
    enquiry.quantity?.toString() || "—",
    <Badge
      key={`${enquiry.id}-badge`}
      tone={enquiry.status === "new" ? "attention" : "success"}
    >
      {enquiry.status === "new" ? "New" : "Reviewed"}
    </Badge>,
    <InlineStack key={`${enquiry.id}-actions`} gap="200" wrap={false}>
      <Button size="slim" onClick={() => setSelectedEnquiryId(enquiry.id)}>
        View
      </Button>
      <Button
        size="slim"
        onClick={() =>
          handleStatusChange(
            enquiry.id,
            enquiry.status === "new" ? "reviewed" : "new",
          )
        }
      >
        {enquiry.status === "new" ? "Mark Reviewed" : "Mark New"}
      </Button>
      <Button
        size="slim"
        tone="critical"
        onClick={() => handleDelete(enquiry.id)}
      >
        Delete
      </Button>
    </InlineStack>,
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
                  ]}
                  headings={[
                    "Date",
                    "Product",
                    "Name",
                    "Email",
                    "Phone",
                    "Qty",
                    "Status",
                    "Actions",
                  ]}
                  rows={rows}
                  truncate
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={Boolean(selectedEnquiry)}
        onClose={() => setSelectedEnquiryId(null)}
        title={selectedEnquiry?.productTitle || "Enquiry details"}
        primaryAction={{
          content:
            selectedEnquiry?.status === "new" ? "Mark Reviewed" : "Mark New",
          onAction: () => {
            if (!selectedEnquiry) return;
            handleStatusChange(
              selectedEnquiry.id,
              selectedEnquiry.status === "new" ? "reviewed" : "new",
            );
          },
        }}
        secondaryActions={[
          {
            content: "Delete",
            destructive: true,
            onAction: () => {
              if (!selectedEnquiry) return;
              handleDelete(selectedEnquiry.id);
            },
          },
        ]}
      >
        <Modal.Section>
          {selectedEnquiry ? (
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text as="p" variant="headingSm">
                  Status
                </Text>
                <Badge
                  tone={selectedEnquiry.status === "new" ? "attention" : "success"}
                >
                  {selectedEnquiry.status === "new" ? "New" : "Reviewed"}
                </Badge>
              </InlineStack>
              <Divider />
              <BlockStack gap="300">
                <DetailRow
                  label="Submitted"
                  value={new Date(selectedEnquiry.createdAt).toLocaleString()}
                />
                <DetailRow
                  label="Product"
                  value={selectedEnquiry.productTitle || "—"}
                />
                <DetailRow
                  label="Product ID"
                  value={
                    selectedEnquiry.productId ||
                    selectedEnquiry.productHandle ||
                    "—"
                  }
                />
                <DetailRow label="Customer name" value={selectedEnquiry.name} />
                <DetailRow label="Email" value={selectedEnquiry.email} />
                <DetailRow label="Phone" value={selectedEnquiry.phone || "—"} />
                <DetailRow
                  label="Quantity"
                  value={selectedEnquiry.quantity?.toString() || "—"}
                />
                <DetailRow
                  label="Comments"
                  value={selectedEnquiry.comments || "—"}
                  multiline
                />
              </BlockStack>
            </BlockStack>
          ) : null}
        </Modal.Section>
      </Modal>
    </Page>
  );
}

function DetailRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <BlockStack gap="100">
      <Text as="p" variant="bodySm" tone="subdued">
        {label}
      </Text>
      <Text as="p" variant="bodyMd" breakWord={multiline}>
        {value}
      </Text>
    </BlockStack>
  );
}
