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

/**
 * Generate an invoice PDF from a guest quote request.
 * @param {Object} request - The guest quote request object
 * @param {Object} options - { download: boolean, filename: string }
 */
export async function generateGuestInvoicePDF(request, options = {}) {
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
  const greenColor = [34, 197, 94];

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

  // Title
  doc.setFontSize(28);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - margin, yPos + 10, { align: 'right' });

  yPos += 25;

  // Invoice number (derived from request number)
  const invoiceNumber = (request.request_number || 'N/A').replace('BW-GQ-', 'BW-INV-');
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${invoiceNumber}`, pageWidth - margin, yPos, { align: 'right' });

  yPos += 6;

  // Date
  doc.text(`Date: ${formatDate(new Date().toISOString())}`, pageWidth - margin, yPos, { align: 'right' });

  yPos += 6;

  // Due upon receipt
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Due Upon Receipt', pageWidth - margin, yPos, { align: 'right' });

  yPos += 12;

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
  const proName = request.pro_profiles?.business_name || 'Service Professional';
  doc.text(proName, margin, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  doc.text(`via ${COMPANY_NAME}`, margin, yPos);
  yPos += 4;
  doc.text(COMPANY_EMAIL, margin, yPos);
  yPos += 4;
  doc.text(COMPANY_PHONE, margin, yPos);

  // BILL TO section
  let toYPos = yPos - 20;
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', margin + colWidth, toYPos);

  toYPos += 6;
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(request.guest_name || 'Client', margin + colWidth, toYPos);

  toYPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  if (request.guest_email) {
    doc.text(request.guest_email, margin + colWidth, toYPos);
    toYPos += 4;
  }
  if (request.guest_phone) {
    doc.text(request.guest_phone, margin + colWidth, toYPos);
    toYPos += 4;
  }
  const address = [request.address, request.city, request.state, request.zip_code].filter(Boolean).join(', ');
  if (address) {
    const addrLines = doc.splitTextToSize(address, colWidth - 5);
    doc.text(addrLines, margin + colWidth, toYPos);
    toYPos += addrLines.length * 4;
  }

  yPos = Math.max(yPos, toYPos) + 10;

  // Service details box
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 3, 3, 'F');

  yPos += 7;
  const detailColWidth = (pageWidth - margin * 2) / 3;

  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Service', margin + 5, yPos);
  doc.text('Location', margin + detailColWidth + 5, yPos);
  doc.text('Service Date', margin + detailColWidth * 2 + 5, yPos);

  yPos += 5;
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(request.service_name || '—', margin + 5, yPos);

  const location = [request.address, request.city, request.state].filter(Boolean).join(', ');
  const locLines = doc.splitTextToSize(location || '—', detailColWidth - 10);
  doc.text(locLines[0] || '—', margin + detailColWidth + 5, yPos);

  doc.text(formatDate(request.preferred_date || request.created_at), margin + detailColWidth * 2 + 5, yPos);

  yPos += 20;

  // Items table
  const items = [];

  // Description / scope of work
  const description = request.pro_quote_description || request.description || 'Professional service';

  // Materials list
  let materialsList = [];
  if (request.pro_materials_list) {
    try {
      materialsList = typeof request.pro_materials_list === 'string'
        ? JSON.parse(request.pro_materials_list)
        : request.pro_materials_list;
      if (!Array.isArray(materialsList)) materialsList = [];
    } catch { materialsList = []; }
  }

  // Labour line
  const subtotal = parseFloat(request.quoted_price || request.pro_quoted_price || 0);
  const materialsTotal = parseFloat(request.pro_materials_total || 0);
  const labourAmount = request.pro_work_price
    ? parseFloat(request.pro_work_price)
    : (materialsTotal > 0 ? subtotal - materialsTotal : subtotal);

  items.push([1, description, 1, 'Service', formatCurrency(labourAmount), formatCurrency(labourAmount)]);

  // Material lines
  materialsList.forEach((mat, idx) => {
    const matPrice = parseFloat(mat.price || mat.amount || 0);
    items.push([idx + 2, mat.name || 'Material', 1, 'Item', formatCurrency(matPrice), formatCurrency(matPrice)]);
  });

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Description', 'Qty', 'Unit', 'Price', 'Amount']],
    body: items,
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

  // Totals
  const totalsX = pageWidth - margin - 80;
  const taxAmount = parseFloat(request.tax_amount || 0);
  const total = subtotal + taxAmount;

  // Subtotal
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, yPos);
  doc.setTextColor(...darkColor);
  doc.text(formatCurrency(subtotal), pageWidth - margin, yPos, { align: 'right' });
  yPos += 6;

  // HST
  doc.setTextColor(...grayColor);
  doc.text('HST (13%):', totalsX, yPos);
  doc.setTextColor(...darkColor);
  doc.text(formatCurrency(taxAmount), pageWidth - margin, yPos, { align: 'right' });
  yPos += 8;

  // Total line
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  doc.line(totalsX, yPos, pageWidth - margin, yPos);
  yPos += 6;

  // Total
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Total Due:', totalsX, yPos);
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrency(total), pageWidth - margin, yPos, { align: 'right' });
  yPos += 15;

  // Payment status banner (if paid)
  const isPaid = ['paid', 'completed'].includes(request.status);
  if (isPaid) {
    doc.setFillColor(...greenColor);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 14, 3, 3, 'F');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('PAID', pageWidth / 2, yPos + 9, { align: 'center' });
    yPos += 22;
  }

  // Additional details
  const details = [];
  if (request.pro_estimated_duration) details.push({ label: 'Estimated Duration', value: request.pro_estimated_duration });
  if (request.pro_warranty_info) details.push({ label: 'Warranty', value: request.pro_warranty_info });

  if (details.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Additional Details', margin, yPos);
    yPos += 7;

    details.forEach(d => {
      doc.setFontSize(9);
      doc.setTextColor(...primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text(`${d.label}:`, margin, yPos);
      yPos += 5;
      doc.setTextColor(...grayColor);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(d.value, pageWidth - margin * 2);
      doc.text(lines, margin, yPos);
      yPos += lines.length * 5 + 4;
    });
  }

  // Pro notes
  if (request.pro_notes) {
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', margin, yPos);
    yPos += 5;
    doc.setTextColor(...grayColor);
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(request.pro_notes, pageWidth - margin * 2);
    doc.text(noteLines, margin, yPos);
  }

  // Footer
  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', pageWidth / 2, footerY - 5, { align: 'center' });
  doc.text(`${COMPANY_NAME} | ${COMPANY_EMAIL} | ${COMPANY_PHONE}`, pageWidth / 2, footerY, { align: 'center' });

  // Save or return
  const pdfFilename = filename || `Invoice-${invoiceNumber}.pdf`;

  if (download) {
    doc.save(pdfFilename);
    return null;
  } else {
    return doc.output('blob');
  }
}

export default generateGuestInvoicePDF;
