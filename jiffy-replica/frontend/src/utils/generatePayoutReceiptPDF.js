'use client';

import jsPDF from 'jspdf';

const COMPANY_NAME = 'BridgeWork Services';
const COMPANY_EMAIL = 'support@bridgeworkservices.com';
const COMPANY_PHONE = '1 (647) 370-1010';

function fmt(amount) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(
    parseFloat(amount || 0)
  );
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generates a PDF earnings/payout receipt for a pro's ledger entry.
 *
 * @param {object} data
 *   @param {string} data.proName
 *   @param {string} data.proEmail
 *   @param {'earning'|'payout'} data.type
 *   @param {number} data.amount          - Pro's net amount
 *   @param {number} data.platformFee     - Platform fee amount
 *   @param {number} data.commissionRate  - e.g. 0.13
 *   @param {string} data.status
 *   @param {string} data.payoutMethod    - 'e_transfer' | 'stripe_connect'
 *   @param {string} data.createdAt
 *   @param {string} [data.serviceName]
 *   @param {string} [data.bookingNumber]
 *   @param {string} [data.bookingId]
 *   @param {string} [data.entryId]       - Ledger entry ID for receipt number
 * @param {object} [options]
 *   @param {boolean} [options.download=true]
 *   @param {string}  [options.filename]
 */
export async function generatePayoutReceiptPDF(data, options = {}) {
  const { download = true, filename } = options;

  const isPayout = data.type === 'payout';
  const jobTotal = parseFloat(data.amount || 0) + parseFloat(data.platformFee || 0);
  const commPct = data.commissionRate != null ? (data.commissionRate * 100).toFixed(0) : '13';
  const receiptNum = data.entryId ? data.entryId.slice(0, 8).toUpperCase() : 'N/A';
  const methodLabel =
    data.payoutMethod === 'stripe_connect' ? 'Stripe Connect (Automatic)' : 'Interac e-Transfer (Manual)';

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const primaryColor = [14, 116, 128];
  const darkColor = [31, 41, 55];
  const grayColor = [107, 114, 128];
  const lightGray = [243, 244, 246];
  const accentColor = isPayout ? [37, 99, 235] : [22, 163, 74];

  let y = margin;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.text(COMPANY_NAME, margin, y + 8);

  doc.setFontSize(20);
  doc.text(isPayout ? 'PAYOUT RECEIPT' : 'EARNINGS RECEIPT', pageWidth - margin, y + 8, { align: 'right' });

  y += 18;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  // ── Meta row ────────────────────────────────────────────────────────────────
  y += 12;
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt #: ${receiptNum}`, margin, y);
  doc.text(`Issued: ${fmtDate(data.createdAt)}`, pageWidth - margin, y, { align: 'right' });

  // ── Status banner ────────────────────────────────────────────────────────────
  y += 10;
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...accentColor);
  doc.text(
    isPayout ? 'PAYOUT PROCESSED' : 'EARNING RECORDED',
    margin + 6,
    y + 11
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...darkColor);
  doc.text(
    `Status: ${(data.status || 'completed').toUpperCase()}`,
    pageWidth - margin - 6,
    y + 11,
    { align: 'right' }
  );

  // ── Pro info + booking info ──────────────────────────────────────────────────
  y += 28;
  const colGap = 12;
  const colWidth = (pageWidth - margin * 2 - colGap) / 2;

  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('PRO / PAYEE', margin, y);
  doc.text('JOB DETAILS', margin + colWidth + colGap, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text(data.proName || 'Pro', margin, y);
  doc.text(data.serviceName || 'Service', margin + colWidth + colGap, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  doc.text(data.proEmail || '', margin, y);
  if (data.bookingNumber) {
    doc.text(`Booking #${data.bookingNumber}`, margin + colWidth + colGap, y);
  } else if (data.bookingId) {
    doc.text(`Booking ID: ${data.bookingId.slice(0, 8)}…`, margin + colWidth + colGap, y);
  }

  // ── Payment method row ───────────────────────────────────────────────────────
  y += 14;
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text('Date', margin + 6, y + 7);
  doc.text('Payout Method', margin + 80, y + 7);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text(fmtDate(data.createdAt), margin + 6, y + 15);
  doc.text(methodLabel, margin + 80, y + 15);

  // ── Earnings breakdown ───────────────────────────────────────────────────────
  y += 34;
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(isPayout ? 'PAYOUT BREAKDOWN' : 'EARNINGS BREAKDOWN', margin, y);

  y += 8;

  const rows = isPayout
    ? [['Amount Paid Out', fmt(data.amount)]]
    : [
        ['Job Total (collected from customer)', fmt(jobTotal)],
        [`Platform Fee (${commPct}%)`, `-${fmt(data.platformFee)}`],
      ];

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...grayColor);
    doc.text(label, margin, y);
    doc.setTextColor(...darkColor);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
    y += 8;
  });

  doc.setDrawColor(209, 213, 219);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...darkColor);
  doc.text(isPayout ? 'Total Paid Out' : 'Your Earnings', margin, y);
  doc.setTextColor(...accentColor);
  doc.text(fmt(data.amount), pageWidth - margin, y, { align: 'right' });

  // ── Note banner ──────────────────────────────────────────────────────────────
  y += 14;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...accentColor);
  doc.text('BridgeWork Earnings Statement', margin + 6, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkColor);
  const note = isPayout
    ? 'This receipt confirms the payout transfer to your account. Keep for your records.'
    : `This confirms your net earnings after the ${commPct}% platform fee. Keep for tax and accounting purposes.`;
  const noteLines = doc.splitTextToSize(note, pageWidth - margin * 2 - 12);
  doc.text(noteLines, margin + 6, y + 15);

  // ── Footer ───────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text(
    `Questions? ${COMPANY_EMAIL} | ${COMPANY_PHONE}`,
    pageWidth / 2,
    pageHeight - 14,
    { align: 'center' }
  );

  const ref = data.bookingNumber || receiptNum;
  const pdfFilename =
    filename ||
    `BridgeWork-${isPayout ? 'Payout' : 'Earnings'}-Receipt-${ref}.pdf`;

  if (download) {
    doc.save(pdfFilename);
    return null;
  }
  return doc.output('blob');
}

export default generatePayoutReceiptPDF;
