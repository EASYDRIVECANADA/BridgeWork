'use client';

import { X, FileText, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function InvoiceViewModal({ isOpen, onClose, invoice }) {
  if (!isOpen || !invoice) return null;

  const items = invoice.items || [];
  const subtotal = parseFloat(invoice.subtotal) || 0;
  const taxRate = parseFloat(invoice.tax_rate) || 0;
  const tax = parseFloat(invoice.tax) || 0;
  const total = parseFloat(invoice.total) || 0;

  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // BridgeWork themed colors
    const primaryTeal = [14, 116, 128]; // #0E7480 - main brand color
    const darkTeal = [10, 90, 99]; // #0a5a63 - darker teal
    const darkGray = [51, 51, 51];
    const lightGray = [128, 128, 128];
    const white = [255, 255, 255];
    
    // ===== HEADER SECTION =====
    // Load and add logo (top left) - LARGER SIZE
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = '/images/logo/logov2.png';
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
      });
      // Larger logo: 60x24 instead of 35x14
      doc.addImage(logoImg, 'PNG', 15, 10, 60, 24);
    } catch (e) {
      // If logo fails, draw a placeholder with brand color
      doc.setFillColor(...primaryTeal);
      doc.roundedRect(15, 10, 60, 24, 3, 3, 'F');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('BridgeWork', 45, 24, { align: 'center' });
    }
    
    // Company name and details (below logo)
    doc.setFontSize(18);
    doc.setTextColor(...primaryTeal);
    doc.setFont('helvetica', 'bold');
    doc.text('BridgeWork Services', 15, 45);
    
    doc.setFontSize(9);
    doc.setTextColor(...lightGray);
    doc.setFont('helvetica', 'normal');
    doc.text('Professional Home Services', 15, 51);
    doc.text('support@bridgework.com', 15, 56);
    
    // ===== RECIPIENT & INVOICE INFO SECTION =====
    // Recipient label
    doc.setFontSize(9);
    doc.setTextColor(...lightGray);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIPIENT:', 15, 72);
    
    // Recipient name
    doc.setFontSize(12);
    doc.setTextColor(...primaryTeal);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.recipient_name || 'Customer', 15, 80);
    
    // Recipient address
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    const addressLines = (invoice.recipient_address || '').split(',').map(s => s.trim());
    let addrY = 86;
    addressLines.forEach(line => {
      if (line) {
        doc.text(line, 15, addrY);
        addrY += 5;
      }
    });
    
    // Invoice info box (right side) - Teal themed
    const boxX = pageWidth - 80;
    const boxY = 68;
    const boxWidth = 65;
    
    // Invoice number row (teal background)
    doc.setFillColor(...primaryTeal);
    doc.rect(boxX, boxY, boxWidth, 10, 'F');
    doc.setFontSize(11);
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice #${invoice.invoice_number || ''}`, boxX + boxWidth/2, boxY + 7, { align: 'center' });
    
    // Issued row
    doc.setFillColor(245, 245, 245);
    doc.rect(boxX, boxY + 10, boxWidth, 8, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'normal');
    doc.text('Issued', boxX + 5, boxY + 16);
    doc.text(invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '-', boxX + boxWidth - 5, boxY + 16, { align: 'right' });
    
    // Due row
    doc.setFillColor(255, 255, 255);
    doc.rect(boxX, boxY + 18, boxWidth, 8, 'F');
    doc.text('Due', boxX + 5, boxY + 24);
    doc.text(invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-', boxX + boxWidth - 5, boxY + 24, { align: 'right' });
    
    // Total row (teal background)
    doc.setFillColor(...primaryTeal);
    doc.rect(boxX, boxY + 26, boxWidth, 10, 'F');
    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.text('Total', boxX + 5, boxY + 33);
    doc.text(`$${total.toFixed(2)}`, boxX + boxWidth - 5, boxY + 33, { align: 'right' });
    
    // ===== FOR SERVICES RENDERED SECTION =====
    let tableStartY = 115;
    
    // Section title
    doc.setFontSize(12);
    doc.setTextColor(...primaryTeal);
    doc.setFont('helvetica', 'bold');
    doc.text('For Services Rendered', 15, tableStartY);
    
    tableStartY += 5;
    
    // Line items table
    const tableData = items.map(item => [
      item.service || '-',
      item.description || '-',
      item.qty?.toString() || '1',
      parseFloat(item.unit_cost || 0).toFixed(2),
      `$${parseFloat(item.total || 0).toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: tableStartY,
      head: [['PRODUCT / SERVICE', 'DESCRIPTION', 'QTY.', 'UNIT PRICE', 'TOTAL']],
      body: tableData,
      theme: 'plain',
      headStyles: {
        fillColor: primaryTeal,
        textColor: white,
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 4,
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 4,
        textColor: darkGray,
        lineColor: [220, 220, 220],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 65 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: 15, right: 15 },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.1
    });
    
    // ===== TOTALS SECTION =====
    const finalY = doc.lastAutoTable.finalY + 15;
    
    // Thanks message (left side)
    doc.setFontSize(10);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'italic');
    doc.text('Thanks for your business!', 15, finalY);
    
    // Totals (right side)
    const totalsX = pageWidth - 80;
    const totalsValueX = pageWidth - 15;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    doc.setFontSize(10);
    
    // Subtotal
    doc.text('Subtotal', totalsX, finalY);
    doc.text(`$${subtotal.toFixed(2)}`, totalsValueX, finalY, { align: 'right' });
    
    // Tax Rate
    doc.text(`Tax Rate`, totalsX, finalY + 8);
    doc.text(`$${tax.toFixed(2)}`, totalsValueX, finalY + 8, { align: 'right' });
    doc.setFontSize(8);
    doc.setTextColor(...lightGray);
    doc.text(`(${(taxRate * 100).toFixed(0)}%)`, totalsX + 20, finalY + 8);
    
    // Total (bold)
    doc.setFontSize(11);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'bold');
    doc.text('Total', totalsX, finalY + 18);
    doc.text(`$${total.toFixed(2)}`, totalsValueX, finalY + 18, { align: 'right' });
    
    // ===== NOTES SECTION =====
    if (invoice.notes) {
      doc.setFontSize(9);
      doc.setTextColor(...lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Notes:', 15, finalY + 35);
      doc.setTextColor(...darkGray);
      const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - 100);
      doc.text(noteLines, 15, finalY + 42);
    }
    
    // ===== FOOTER =====
    doc.setFontSize(8);
    doc.setTextColor(...lightGray);
    doc.setFont('helvetica', 'normal');
    doc.text('POWERED BY', 15, 280);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryTeal);
    doc.text('BRIDGEWORK', 15, 285);
    
    // Save PDF
    doc.save(`Invoice-${invoice.invoice_number}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0E7480]" />
            <h2 className="text-lg font-bold text-gray-900">Invoice #{invoice.invoice_number}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {/* Recipient Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Recipient Name</label>
              <div className="text-sm text-gray-900 font-medium">{invoice.recipient_name || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Recipient Address</label>
              <div className="text-sm text-gray-900">{invoice.recipient_address || '-'}</div>
            </div>
          </div>
          {/* Invoice Info */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Number</label>
              <div className="text-sm text-gray-900 font-semibold">{invoice.invoice_number}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Issue Date</label>
              <div className="text-sm text-gray-900">{invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
              <div className="text-sm text-gray-900">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</div>
            </div>
          </div>
          {/* Subject */}
          {invoice.subject && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
              <div className="text-sm text-gray-900">{invoice.subject}</div>
            </div>
          )}
          {/* Line Items */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Line Items</label>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-[#0E7480] text-white">
                  <tr>
                    <th className="px-2 py-2 text-left">Service/Product</th>
                    <th className="px-2 py-2 text-left">Description</th>
                    <th className="px-2 py-2 text-center w-16">Qty</th>
                    <th className="px-2 py-2 text-center w-24">Unit Cost</th>
                    <th className="px-2 py-2 text-center w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-b-0 bg-gray-50">
                      <td className="px-2 py-2">{item.service || '-'}</td>
                      <td className="px-2 py-2">{item.description || '-'}</td>
                      <td className="px-2 py-2 text-center">{item.qty}</td>
                      <td className="px-2 py-2 text-center">${parseFloat(item.unit_cost || 0).toFixed(2)}</td>
                      <td className="px-2 py-2 text-center font-semibold">${parseFloat(item.total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Notes */}
          {invoice.notes && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{invoice.notes}</div>
            </div>
          )}
          {/* Tax & Totals */}
          <div className="flex flex-col items-end gap-2 border-t pt-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Tax ({(taxRate * 100).toFixed(0)}%):</span>
              <span className="font-semibold text-gray-900">${tax.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-4 text-lg">
              <span className="font-bold text-gray-900">Invoice Total:</span>
              <span className="font-bold text-[#0E7480]">${total.toFixed(2)}</span>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={handleDownloadPDF}
              className="px-5 py-2 rounded-lg bg-[#0E7480] text-white font-medium hover:bg-[#0a5a63] flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
