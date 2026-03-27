'use client';

import jsPDF from 'jspdf';

const COMPANY_NAME = 'BridgeWork Services';
const COMPANY_EMAIL = 'support@bridgework.ca';
const COMPANY_PHONE = '(416) 555-0100';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(parseFloat(amount || 0));
}

function formatDate(dateStr) {
  if (!dateStr) return 'TBD';
  return new Date(dateStr).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timeStr) {
  if (!timeStr) return 'TBD';
  return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export async function generateReceiptPDF(receipt, options = {}) {
  const { download = true, filename } = options;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const primaryColor = [14, 116, 128];
  const darkColor = [31, 41, 55];
  const grayColor = [107, 114, 128];
  const lightGray = [243, 244, 246];
  const successColor = receipt.paymentStatus === 'paid' ? [22, 163, 74] : [37, 99, 235];
  let yPos = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.text(COMPANY_NAME, margin, yPos + 8);

  doc.setFontSize(24);
  doc.text('E-RECEIPT', pageWidth - margin, yPos + 8, { align: 'right' });

  yPos += 18;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 12;
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt #: ${receipt.receiptNumber}`, margin, yPos);
  doc.text(`Issued: ${formatDate(receipt.issuedAt)}`, pageWidth - margin, yPos, { align: 'right' });

  yPos += 10;
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 18, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...successColor);
  doc.text(receipt.statusLabel, margin + 6, yPos + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...darkColor);
  doc.text(receipt.statusDescription, pageWidth - margin - 6, yPos + 11, { align: 'right' });

  yPos += 28;
  const colGap = 12;
  const colWidth = (pageWidth - margin * 2 - colGap) / 2;

  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER', margin, yPos);
  doc.text('BOOKING', margin + colWidth + colGap, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text(receipt.customerName || 'Customer', margin, yPos);
  doc.text(receipt.serviceName || 'Service', margin + colWidth + colGap, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  doc.text(receipt.customerEmail || 'No email on file', margin, yPos);
  doc.text(`Booking #${receipt.bookingNumber || receipt.bookingId}`, margin + colWidth + colGap, yPos);

  yPos += 5;
  const locationText = [receipt.address, receipt.city, receipt.state, receipt.zipCode].filter(Boolean).join(', ');
  doc.text(locationText || 'Location not provided', margin + colWidth + colGap, yPos);

  yPos += 12;
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 28, 3, 3, 'F');

  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text('Scheduled Date', margin + 6, yPos + 8);
  doc.text('Scheduled Time', margin + 64, yPos + 8);
  doc.text('Payment Method', margin + 122, yPos + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text(formatDate(receipt.scheduledDate), margin + 6, yPos + 17);
  doc.text(formatTime(receipt.scheduledTime), margin + 64, yPos + 17);
  doc.text(receipt.paymentMethodLabel || 'Card via Stripe', margin + 122, yPos + 17);

  yPos += 40;
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text('PAYMENT BREAKDOWN', margin, yPos);

  yPos += 8;
  const rows = [
    ['Service Fee', formatCurrency(receipt.baseAmount)],
  ];
  if (parseFloat(receipt.discountAmount) > 0) {
    rows.push(['Discount', `-${formatCurrency(receipt.discountAmount)}`]);
  }
  rows.push([`Tax (${receipt.taxLabel || 'HST'})`, formatCurrency(receipt.taxAmount)]);

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...grayColor);
    doc.text(label, margin, yPos);
    doc.setTextColor(...darkColor);
    doc.text(value, pageWidth - margin, yPos, { align: 'right' });
    yPos += 7;
  });

  doc.setDrawColor(209, 213, 219);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...darkColor);
  doc.text('Total', margin, yPos);
  doc.text(formatCurrency(receipt.totalAmount), pageWidth - margin, yPos, { align: 'right' });

  yPos += 12;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 24, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...successColor);
  doc.text(receipt.nextStepTitle, margin + 6, yPos + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkColor);
  const nextStepLines = doc.splitTextToSize(receipt.nextStepDescription, pageWidth - margin * 2 - 12);
  doc.text(nextStepLines, margin + 6, yPos + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text(`Questions? ${COMPANY_EMAIL} | ${COMPANY_PHONE}`, pageWidth / 2, pageHeight - 14, { align: 'center' });

  const pdfFilename = filename || `BridgeWork-Receipt-${receipt.bookingNumber || receipt.bookingId}.pdf`;
  if (download) {
    doc.save(pdfFilename);
    return null;
  }

  return doc.output('blob');
}

export default generateReceiptPDF;