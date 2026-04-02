import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  json,
} from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  DataTable,
  Text,
  Button,
  BlockStack,
  EmptyState,
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

  const enquiries = await prisma.enquiry.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return json({
    enquiries: enquiries.map((enquiry) => ({
      ...enquiry,
      createdAt: enquiry.createdAt.toISOString(),
    })),
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

  return json({ success: false, error: "Invalid action." }, { status: 400 });
};

export default function Enquiries() {
  const { enquiries } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null);

  const selectedEnquiry = useMemo(
    () => enquiries.find((enquiry) => enquiry.id === selectedEnquiryId) ?? null,
    [enquiries, selectedEnquiryId],
  );

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
    <InlineStack key={`${enquiry.id}-actions`} gap="200" wrap={false}>
      <Button size="slim" onClick={() => setSelectedEnquiryId(enquiry.id)}>
        View
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
      fullWidth
      title="Enquiries"
      subtitle={`${enquiries.length} enquirie${enquiries.length !== 1 ? "s" : ""} found`}
    >
      <Card>
        {enquiries.length === 0 ? (
          <EmptyState
            heading="No enquiries found"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <Text as="p" variant="bodyMd">
              When customers submit enquiries from your storefront, they will appear here.
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
            ]}
            headings={[
              "Date",
              "Product",
              "Name",
              "Email",
              "Phone",
              "Qty",
              "Actions",
            ]}
            rows={rows}
            truncate
          />
        )}
      </Card>

      <Modal
        open={Boolean(selectedEnquiry)}
        onClose={() => setSelectedEnquiryId(null)}
        title={selectedEnquiry?.productTitle || "Enquiry details"}
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
              <BlockStack gap="300">
                <DetailRow
                  label="Submitted"
                  value={new Date(selectedEnquiry.createdAt).toLocaleString()}
                />
                <DetailRow
                  label="Product"
                  value={selectedEnquiry.productTitle || "—"}
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
