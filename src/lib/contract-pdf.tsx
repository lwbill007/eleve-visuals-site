import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { BookingTermsContent } from "@/lib/types";

export interface ContractDetails {
  clientName: string;
  packageName: string;
  preferredDate?: string;
  totalValue: number;
  depositAmount: number;
  signerName: string;
  signedAt: string;
  signerIp: string;
  terms: BookingTermsContent;
}

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  headline: { fontSize: 18, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  intro: { marginBottom: 16, color: "#444" },
  summaryBox: { border: "1pt solid #ccc", padding: 12, marginBottom: 20 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  summaryLabel: { color: "#666" },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 4 },
  sectionBody: { color: "#333", lineHeight: 1.4 },
  signatureBox: { marginTop: 28, borderTop: "1pt solid #ccc", paddingTop: 12 },
  signatureLine: { marginBottom: 4 },
});

function ContractDocument({ details }: { details: ContractDetails }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.headline}>ÉLEVÉ Visuals — {details.terms.headline}</Text>
        <Text style={styles.intro}>{details.terms.intro}</Text>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Client</Text>
            <Text>{details.clientName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Package</Text>
            <Text>{details.packageName}</Text>
          </View>
          {details.preferredDate ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Preferred Date</Text>
              <Text>{details.preferredDate}</Text>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Project Value</Text>
            <Text>${details.totalValue.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Deposit (50%)</Text>
            <Text>${details.depositAmount.toLocaleString()}</Text>
          </View>
        </View>

        {details.terms.sections.map((section) => (
          <View key={section.title} wrap={false}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.signatureBox}>
          <Text style={styles.signatureLine}>Signed by: {details.signerName}</Text>
          <Text style={styles.signatureLine}>
            Date: {new Date(details.signedAt).toLocaleString()}
          </Text>
          <Text style={styles.signatureLine}>IP address: {details.signerIp}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateContractPdf(details: ContractDetails): Promise<Buffer> {
  return renderToBuffer(<ContractDocument details={details} />);
}
