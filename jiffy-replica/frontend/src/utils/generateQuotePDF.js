'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LOGO_PATH = '/images/logo/logov2.png';
const COMPANY_NAME = 'BridgeWork Services';
const COMPANY_ADDRESS = 'Ontario, Canada';
const COMPANY_EMAIL = 'support@bridgeworkservices.com';
const COMPANY_PHONE = '1 (647) 370-1010';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' });
}

export async function generateQuotePDF(quote, options = {}) {
  const { download = true, filename } = options;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Colors
  const primaryColor = [14, 116, 128]; // #0E7480
  const grayColor = [100, 100, 100];
  const darkColor = [30, 30, 30];
  const lightGray = [240, 240, 240];

  // Load and add logo
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = LOGO_PATH;
    });
    doc.addImage(img, 'PNG', margin, yPos, 40, 15);
  } catch (e) {
    doc.setFontSize(20);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_NAME, margin, yPos + 10);
  }

  // Quote title on the right
  doc.setFontSize(28);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTE', pageWidth - margin, yPos + 10, { align: 'right' });

  yPos += 25;

  // Quote number and status
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Quote #: ${quote.quote_number || 'N/A'}`, pageWidth - margin, yPos, { align: 'right' });

  yPos += 6;

  // Status badge
  const status = quote.status?.toUpperCase() || 'DRAFT';
  const statusColors = {
    'ACCEPTED': [34, 197, 94],
    'SENT': [59, 130, 246],
    'DECLINED': [239, 68, 68],
    'DRAFT': [156, 163, 175],
    'EXPIRED': [234, 179, 8],
    'VIEWED': [99, 102, 241],
  };
  const statusColor = statusColors[status] || grayColor;
  doc.setTextColor(...statusColor);
  doc.setFont('helvetica', 'bold');
  doc.text(status, pageWidth - margin, yPos, { align: 'right' });

  yPos += 15;

  // Horizontal line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 15;

  // From and To sections
  const colWidth = (pageWidth - margin * 2) / 2;

  // FROM section
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('FROM', margin, yPos);

  yPos += 6;
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const proName = quote.pro_profiles?.business_name || quote.pro_profiles?.profiles?.full_name || 'Service Professional';
  doc.text(proName, margin, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  if (quote.pro_profiles?.profiles?.email) {
    doc.text(quote.pro_profiles.profiles.email, margin, yPos);
    yPos += 4;
  }
  if (quote.pro_profiles?.profiles?.phone) {
    doc.text(quote.pro_profiles.profiles.phone, margin, yPos);
    yPos += 4;
  }

  // TO section
  let toYPos = yPos - 15;
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('PREPARED FOR', margin + colWidth, toYPos);

  toYPos += 6;
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const customerName = quote.customer?.full_name || 'Customer';
  doc.text(customerName, margin + colWidth, toYPos);

  toYPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  if (quote.customer?.email) {
    doc.text(quote.customer.email, margin + colWidth, toYPos);
    toYPos += 4;
  }
  if (quote.customer?.phone) {
    doc.text(quote.customer.phone, margin + colWidth, toYPos);
    toYPos += 4;
  }

  yPos = Math.max(yPos, toYPos) + 10;

  // Dates section
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 3, 3, 'F');

  yPos += 7;
  const dateColWidth = (pageWidth - margin * 2) / 3;

  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Issue Date', margin + 5, yPos);
  doc.text('Valid Until', margin + dateColWidth + 5, yPos);
  if (quote.sent_at) doc.text('Sent', margin + dateColWidth * 2 + 5, yPos);

  yPos += 5;
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(formatDate(quote.issue_date || quote.created_at), margin + 5, yPos);
  doc.text(formatDate(quote.valid_until), margin + dateColWidth + 5, yPos);
  if (quote.sent_at) doc.text(formatDate(quote.sent_at), margin + dateColWidth * 2 + 5, yPos);

  yPos += 18;

  // Title
  if (quote.title) {
    doc.setFontSize(12);
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    doc.text(quote.title, margin, yPos);
    yPos += 8;
  }

  // Description
  if (quote.description) {
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.setFont('helvetica', 'italic');
    const descLines = doc.splitTextToSize(quote.description, pageWidth - margin * 2);
    doc.text(descLines, margin, yPos);
    yPos += descLines.length * 5 + 5;
  }

  // Items table
  const items = quote.quote_items || [];
  const tableData = items.map((item, idx) => [
    idx + 1,
    item.description,
    item.quantity,
    item.unit || 'each',
    formatCurrency(item.unit_price),
    formatCurrency(item.amount)
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Description', 'Qty', 'Unit', 'Price', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkColor,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'right' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: margin, right: margin },
    tableWidth: 'auto',
  });

  yPos = (doc.lastAutoTable?.finalY || doc.previousAutoTable?.finalY || yPos) + 10;

  // Totals section
  const totalsX = pageWidth - margin - 80;

  // Subtotal
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, yPos);
  doc.setTextColor(...darkColor);
  doc.text(formatCurrency(quote.subtotal), pageWidth - margin, yPos, { align: 'right' });
  yPos += 6;

  // Discount
  if (parseFloat(quote.discount_amount) > 0) {
    doc.setTextColor(...grayColor);
    doc.text('Discount:', totalsX, yPos);
    doc.setTextColor(34, 197, 94);
    doc.text(`-${formatCurrency(quote.discount_amount)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;
  }

  // Tax
  const taxRate = ((parseFloat(quote.tax_rate) || 0) * 100).toFixed(0);
  doc.setTextColor(...grayColor);
  doc.text(`Tax (${taxRate}%):`, totalsX, yPos);
  doc.setTextColor(...darkColor);
  doc.text(formatCurrency(quote.tax_amount), pageWidth - margin, yPos, { align: 'right' });
  yPos += 8;

  // Total line
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  doc.line(totalsX, yPos, pageWidth - margin, yPos);
  yPos += 6;

  // Total
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Total:', totalsX, yPos);
  doc.text(formatCurrency(quote.total), pageWidth - margin, yPos, { align: 'right' });
  yPos += 15;

  // Notes
  if (quote.notes) {
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', margin, yPos);
    yPos += 5;
    doc.setTextColor(...grayColor);
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(quote.notes, pageWidth - margin * 2);
    doc.text(noteLines, margin, yPos);
  }

  // Footer
  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your interest!', pageWidth / 2, footerY - 5, { align: 'center' });
  doc.text(`${COMPANY_NAME} | ${COMPANY_EMAIL} | ${COMPANY_PHONE}`, pageWidth / 2, footerY, { align: 'center' });

  // Save or return
  const pdfFilename = filename || `Quote-${quote.quote_number || quote.id}.pdf`;

  if (download) {
    doc.save(pdfFilename);
    return null;
  } else {
    return doc.output('blob');
  }
}

export default generateQuotePDF;
