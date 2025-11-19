/**
 * B2B Invoice Service
 * Generates invoice PDFs for completed B2B orders
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import WholesalerOrder, { IWholesalerOrder } from '../models/WholesalerOrder.model';
import User from '../models/User.model';
import Wholesaler from '../models/Wholesaler.model';
import { logger } from '../utils/logger';

interface InvoiceData {
  order: IWholesalerOrder;
  wholesaler: any;
  retailer: any;
}

class B2BInvoiceService {
  private invoicesDir: string;

  constructor() {
    // Create invoices directory if it doesn't exist
    this.invoicesDir = path.join(__dirname, '../../uploads/invoices');
    if (!fs.existsSync(this.invoicesDir)) {
      fs.mkdirSync(this.invoicesDir, { recursive: true });
    }
  }

  /**
   * Generate invoice PDF for a B2B order
   */
  async generateInvoice(orderId: string): Promise<string> {
    try {
      logger.info(`📄 Generating invoice for order: ${orderId}`);

      // Fetch order with populated data
      const order = await WholesalerOrder.findById(orderId)
        .populate('retailerId')
        .populate('wholesalerId')
        .populate('items.productId', 'name unit');

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'COMPLETED') {
        throw new Error('Can only generate invoice for completed orders');
      }

      // Fetch wholesaler details
      const wholesaler = await Wholesaler.findById(order.wholesalerId);
      if (!wholesaler) {
        throw new Error('Wholesaler not found');
      }

      // Create PDF
      const fileName = `invoice-${order.orderNumber}-${Date.now()}.pdf`;
      const filePath = path.join(this.invoicesDir, fileName);

      await this.createPDF({ order, wholesaler, retailer: order.retailerId }, filePath);

      // Return relative path for storage/access
      const relativeFilePath = `/uploads/invoices/${fileName}`;

      // Update order with invoice URL
      order.invoiceUrl = relativeFilePath;
      await order.save();

      logger.info(`✅ Invoice generated: ${fileName}`);
      return relativeFilePath;
    } catch (error: any) {
      logger.error('❌ Invoice generation error:', error);
      throw error;
    }
  }

  /**
   * Create PDF document
   */
  private async createPDF(data: InvoiceData, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const { order, wholesaler, retailer } = data;

        // Create PDF document
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('TAX INVOICE', { align: 'center' })
          .moveDown();

        // Invoice details
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Invoice Number: ${order.orderNumber}`, 50, 120)
          .text(`Invoice Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 50, 135)
          .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 50, 150)
          .text(`Payment Status: ${order.paymentStatus}`, 50, 165);

        // Wholesaler details (left side)
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('From (Supplier):', 50, 200)
          .fontSize(10)
          .font('Helvetica')
          .text(wholesaler.businessName || 'N/A', 50, 220)
          .text(wholesaler.profile?.name || 'N/A', 50, 235)
          .text(`GSTIN: ${wholesaler.gstin || 'N/A'}`, 50, 250)
          .text(`PAN: ${wholesaler.pan || 'N/A'}`, 50, 265)
          .text(`Phone: ${wholesaler.profile?.phone || 'N/A'}`, 50, 280);

        // Retailer details (right side)
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('To (Buyer):', 320, 200)
          .fontSize(10)
          .font('Helvetica')
          .text(retailer.store?.name || retailer.businessName || 'N/A', 320, 220)
          .text(retailer.profile?.name || 'N/A', 320, 235)
          .text(`GSTIN: ${retailer.gstin || 'N/A'}`, 320, 250)
          .text(`Phone: ${retailer.profile?.phone || 'N/A'}`, 320, 265);

        // Delivery address
        if (order.deliveryAddress) {
          doc.text('Delivery Address:', 320, 280);
          doc.text(
            `${order.deliveryAddress.street}, ${order.deliveryAddress.city}`,
            320,
            295
          );
          doc.text(
            `${order.deliveryAddress.state} - ${order.deliveryAddress.zipCode}`,
            320,
            310
          );
        }

        // Items table
        const tableTop = 350;
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('ITEMS', 50, tableTop);

        // Table headers
        const headerY = tableTop + 25;
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Item', 50, headerY)
          .text('Qty', 250, headerY, { width: 60, align: 'right' })
          .text('Unit Price', 310, headerY, { width: 70, align: 'right' })
          .text('Discount', 380, headerY, { width: 60, align: 'right' })
          .text('Amount', 450, headerY, { width: 90, align: 'right' });

        // Draw line
        doc
          .moveTo(50, headerY + 15)
          .lineTo(540, headerY + 15)
          .stroke();

        // Table rows
        let itemY = headerY + 25;
        doc.fontSize(9).font('Helvetica');

        order.items.forEach((item: any) => {
          const product = item.productId;
          const itemName = product?.name || item.name || 'Unknown Product';

          doc
            .text(itemName, 50, itemY, { width: 180 })
            .text(`${item.quantity}`, 250, itemY, { width: 60, align: 'right' })
            .text(`₹${item.unitPrice.toFixed(2)}`, 310, itemY, { width: 70, align: 'right' })
            .text(`${item.volumeDiscount}%`, 380, itemY, { width: 60, align: 'right' })
            .text(`₹${item.subtotal.toFixed(2)}`, 450, itemY, { width: 90, align: 'right' });

          itemY += 20;
        });

        // Totals section
        const totalsY = itemY + 30;
        doc
          .moveTo(350, totalsY - 10)
          .lineTo(540, totalsY - 10)
          .stroke();

        doc
          .fontSize(10)
          .font('Helvetica')
          .text('Subtotal:', 380, totalsY, { width: 70, align: 'right' })
          .text(`₹${order.totalAmount.toFixed(2)}`, 450, totalsY, { width: 90, align: 'right' });

        // GST calculation (assuming 18% GST)
        const gstRate = 0.18;
        const gstAmount = order.totalAmount * gstRate;
        const totalWithGST = order.totalAmount + gstAmount;

        doc
          .text('GST (18%):', 380, totalsY + 20, { width: 70, align: 'right' })
          .text(`₹${gstAmount.toFixed(2)}`, 450, totalsY + 20, { width: 90, align: 'right' });

        doc
          .moveTo(350, totalsY + 35)
          .lineTo(540, totalsY + 35)
          .stroke();

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Total:', 380, totalsY + 45, { width: 70, align: 'right' })
          .text(`₹${totalWithGST.toFixed(2)}`, 450, totalsY + 45, { width: 90, align: 'right' });

        // Payment terms
        const termsY = totalsY + 80;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Payment Terms:', 50, termsY)
          .font('Helvetica')
          .text('Net 30 days from invoice date', 50, termsY + 15)
          .text(`Payment Due: ${order.paymentDueDate ? new Date(order.paymentDueDate).toLocaleDateString('en-IN') : 'N/A'}`, 50, termsY + 30);

        // Footer
        doc
          .fontSize(8)
          .font('Helvetica')
          .text(
            'This is a computer-generated invoice and does not require a physical signature.',
            50,
            750,
            { align: 'center', width: 500 }
          );

        doc.end();

        stream.on('finish', () => {
          resolve();
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get invoice file path for download
   */
  getInvoicePath(invoiceUrl: string): string {
    // Convert relative URL to absolute file path
    const fileName = path.basename(invoiceUrl);
    return path.join(this.invoicesDir, fileName);
  }

  /**
   * Check if invoice exists
   */
  invoiceExists(invoiceUrl: string): boolean {
    const filePath = this.getInvoicePath(invoiceUrl);
    return fs.existsSync(filePath);
  }
}

export default new B2BInvoiceService();
