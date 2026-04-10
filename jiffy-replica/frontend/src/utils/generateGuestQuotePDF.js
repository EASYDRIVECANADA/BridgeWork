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
 * Generate a PDF for a guest quote request's pro quotation.
 * @param {Object} request - The guest quote request object from the admin listing
 * @param {Object} options - { download: boolean, filename: string }
 */
export async function generateGuestQuotePDF(request, options = {}) {
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

  // Title on the right
  doc.setFontSize(28);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', pageWidth - margin, yPos + 10, { align: 'right' });

  yPos += 25;

  // Request number
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ref #: ${request.request_number || 'N/A'}`, pageWidth - margin, yPos, { align: 'right' });

  yPos += 6;

  // Date
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(request.pro_quote_submitted_at || request.created_at)}`, pageWidth - margin, yPos, { align: 'right' });

  yPos += 15;

  // Horizontal line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 15;

  // From and To sections
  const colWidth = (pageWidth - margin * 2) / 2;

  // FROM section (Pro)
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

  // TO section (Client)
  let toYPos = yPos - 12;
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('PREPARED FOR', margin + colWidth, toYPos);

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

  yPos = Math.max(yPos, toYPos) + 10;

  // Service details box
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 28, 3, 3, 'F');

  yPos += 7;
  const detailColWidth = (pageWidth - margin * 2) / 3;

  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Service', margin + 5, yPos);
  doc.text('Location', margin + detailColWidth + 5, yPos);
  doc.text('Preferred Date', margin + detailColWidth * 2 + 5, yPos);

  yPos += 5;
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(request.service_name || '—', margin + 5, yPos);

  const location = [request.address, request.city, request.state].filter(Boolean).join(', ');
  const locationLines = doc.splitTextToSize(location || '—', detailColWidth - 10);
  doc.text(locationLines[0] || '—', margin + detailColWidth + 5, yPos);

  doc.text(formatDate(request.preferred_date), margin + detailColWidth * 2 + 5, yPos);

  yPos += 22;

  // Description / Scope of Work
  if (request.pro_quote_description || request.description) {
    doc.setFontSize(11);
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Scope of Work', margin, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.setFont('helvetica', 'normal');
    const desc = request.pro_quote_description || request.description || '';
    const descLines = doc.splitTextToSize(desc, pageWidth - margin * 2);
    doc.text(descLines, margin, yPos);
    yPos += descLines.length * 5 + 8;
  }

  // Materials table (if materials list exists)
  const materials = request.pro_materials_list;
  if (Array.isArray(materials) && materials.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Materials', margin, yPos);
    yPos += 5;

    const tableData = materials.map((item, idx) => [
      idx + 1,
      item.name || item.description || '—',
      formatCurrency(item.price || item.amount || 0)
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Item', 'Cost']],
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
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: margin, right: margin },
      tableWidth: 'auto',
    });

    yPos = (doc.lastAutoTable?.finalY || doc.previousAutoTable?.finalY || yPos) + 10;
  }

  // Price breakdown
  const totalsX = pageWidth - margin - 80;

  if (request.pro_work_price) {
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.setFont('helvetica', 'normal');
    doc.text('Labour:', totalsX, yPos);
    doc.setTextColor(...darkColor);
    doc.text(formatCurrency(request.pro_work_price), pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;
  }

  if (request.pro_materials_total) {
    doc.setTextColor(...grayColor);
    doc.text('Materials:', totalsX, yPos);
    doc.setTextColor(...darkColor);
    doc.text(formatCurrency(request.pro_materials_total), pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;
  }

  // Show final admin quote (subtotal + HST + total) if available, otherwise pro's quoted price
  if (request.quoted_price) {
    // Subtotal
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totalsX, yPos);
    doc.setTextColor(...darkColor);
    doc.text(formatCurrency(request.quoted_price), pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;

    // HST
    doc.setTextColor(...grayColor);
    doc.text('HST:', totalsX, yPos);
    doc.setTextColor(...darkColor);
    doc.text(formatCurrency(request.tax_amount), pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;

    // Total line
    doc.setDrawColor(...grayColor);
    doc.setLineWidth(0.3);
    doc.line(totalsX, yPos, pageWidth - margin, yPos);
    yPos += 6;

    const total = parseFloat(request.quoted_price || 0) + parseFloat(request.tax_amount || 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text('Total:', totalsX, yPos);
    doc.setTextColor(...primaryColor);
    doc.text(formatCurrency(total), pageWidth - margin, yPos, { align: 'right' });
  } else {
    // Only pro's quoted price (no admin finalization yet)
    doc.setDrawColor(...grayColor);
    doc.setLineWidth(0.3);
    doc.line(totalsX, yPos, pageWidth - margin, yPos);
    yPos += 6;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text('Quoted Price:', totalsX, yPos);
    doc.setTextColor(...primaryColor);
    doc.text(formatCurrency(request.pro_quoted_price), pageWidth - margin, yPos, { align: 'right' });
  }
  yPos += 15;

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

  // Pro Notes
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
  doc.text('Thank you for your interest!', pageWidth / 2, footerY - 5, { align: 'center' });
  doc.text(`${COMPANY_NAME} | ${COMPANY_EMAIL} | ${COMPANY_PHONE}`, pageWidth / 2, footerY, { align: 'center' });

  // Save or return
  const pdfFilename = filename || `Quotation-${request.request_number || request.id}.pdf`;

  if (download) {
    doc.save(pdfFilename);
    return null;
  } else {
    return doc.output('blob');
  }
}

export default generateGuestQuotePDF;
