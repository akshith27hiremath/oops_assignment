/**
 * Invoice Service
 * Generates PDF invoices for orders
 */

import { IOrder, ISubOrder } from '../models/Order.model';
import { logger } from '../utils/logger';

interface CustomerInvoiceData {
  order: IOrder;
  customerName: string;
  customerEmail: string;
}

interface RetailerInvoiceData {
  order: IOrder;
  subOrder?: ISubOrder;
  customerName: string;
  customerEmail: string;
  retailerName: string;
  retailerEmail: string;
}

class InvoiceService {
  /**
   * Generate invoice for customer (full order with all sub-orders)
   */
  async generateCustomerInvoice(data: CustomerInvoiceData): Promise<string> {
    try {
      const { order, customerName, customerEmail } = data;

      const invoice = this.formatCustomerInvoice(order, customerName, customerEmail);

      logger.info(`✅ Customer invoice generated for order ${order.orderId}`);

      return invoice;
    } catch (error: any) {
      logger.error(`❌ Customer invoice generation failed: ${error.message}`);
      throw new Error(`Failed to generate customer invoice: ${error.message}`);
    }
  }

  /**
   * Generate invoice for retailer (their sub-order only)
   */
  async generateRetailerInvoice(data: RetailerInvoiceData): Promise<string> {
    try {
      const { order, subOrder, customerName, customerEmail, retailerName, retailerEmail } = data;

      const invoice = this.formatRetailerInvoice(
        order,
        subOrder,
        customerName,
        customerEmail,
        retailerName,
        retailerEmail
      );

      logger.info(`✅ Retailer invoice generated for ${subOrder?.subOrderId || order.orderId}`);

      return invoice;
    } catch (error: any) {
      logger.error(`❌ Retailer invoice generation failed: ${error.message}`);
      throw new Error(`Failed to generate retailer invoice: ${error.message}`);
    }
  }

  /**
   * Format customer invoice (shows all sub-orders from all retailers)
   */
  private formatCustomerInvoice(
    order: IOrder,
    customerName: string,
    customerEmail: string
  ): string {
    const lineWidth = 80;
    const line = '='.repeat(lineWidth);
    const dashLine = '-'.repeat(lineWidth);

    let invoice = '';

    // Header
    invoice += line + '\n';
    invoice += this.centerText('CUSTOMER INVOICE', lineWidth) + '\n';
    invoice += this.centerText('Live MART - Online Delivery System', lineWidth) + '\n';
    invoice += line + '\n\n';

    // Invoice Details
    invoice += `Invoice Number:  ${order.orderId}\n`;
    invoice += `Invoice Date:    ${new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}\n`;
    invoice += `Order Status:    ${order.status}\n`;
    invoice += `Payment Status:  ${order.paymentStatus}\n`;
    invoice += `Payment Method:  COD (Cash on Delivery)\n\n`;

    invoice += dashLine + '\n';
    invoice += this.centerText('BILL TO', lineWidth) + '\n';
    invoice += dashLine + '\n';
    invoice += `Customer:  ${customerName}\n`;
    invoice += `Email:     ${customerEmail}\n`;
    invoice += `Address:   ${order.deliveryAddress.street}\n`;
    invoice += `           ${order.deliveryAddress.city}, ${order.deliveryAddress.state}\n`;
    invoice += `           ${order.deliveryAddress.zipCode}, ${order.deliveryAddress.country}\n\n`;

    // Check if multi-retailer order or single-retailer order
    if (order.subOrders && order.subOrders.length > 0) {
      // Multi-retailer order: Show each sub-order separately
      invoice += line + '\n';
      invoice += this.centerText('ORDER BREAKDOWN BY RETAILER', lineWidth) + '\n';
      invoice += line + '\n\n';

      order.subOrders.forEach((subOrder: any, index: number) => {
        const retailerInfo = subOrder.retailerId;
        const retailerName = retailerInfo?.businessName || retailerInfo?.profile?.name || 'Unknown Retailer';
        const retailerEmail = retailerInfo?.email || '';

        invoice += dashLine + '\n';
        invoice += this.centerText(`SUB-ORDER ${index + 1} / ${order.subOrders.length}`, lineWidth) + '\n';
        invoice += dashLine + '\n';
        invoice += `Sub-Order ID:    ${subOrder.subOrderId}\n`;
        invoice += `Retailer:        ${retailerName}\n`;
        if (retailerEmail) {
          invoice += `Email:           ${retailerEmail}\n`;
        }
        invoice += `Status:          ${subOrder.status}\n`;
        invoice += `Payment Status:  ${subOrder.paymentStatus}\n\n`;

        // Items Table
        invoice += this.padRight('ITEM', 40) + this.padRight('QTY', 8) + this.padRight('PRICE', 14) + this.padRight('TOTAL', 18) + '\n';
        invoice += dashLine + '\n';

        subOrder.items.forEach((item: any) => {
          const itemName = item.name.length > 37 ? item.name.substring(0, 37) + '...' : item.name;
          invoice += this.padRight(itemName, 40);
          invoice += this.padRight(item.quantity.toString(), 8);
          invoice += this.padRight(`₹${item.unitPrice.toFixed(2)}`, 14);
          invoice += this.padRight(`₹${item.subtotal.toFixed(2)}`, 18);
          invoice += '\n';
        });

        invoice += dashLine + '\n';

        // Sub-order totals
        invoice += this.padRight('', lineWidth - 32) + this.padRight('Subtotal:', 14) + this.padRight(`₹${subOrder.subtotalAfterProductDiscounts.toFixed(2)}`, 18) + '\n';
        if (subOrder.tierCodeDiscountShare > 0) {
          invoice += this.padRight('', lineWidth - 32) + this.padRight('Discount:', 14) + this.padRight(`-₹${subOrder.tierCodeDiscountShare.toFixed(2)}`, 18) + '\n';
        }
        invoice += this.padRight('', lineWidth - 32) + this.padRight('SUB-TOTAL:', 14) + this.padRight(`₹${subOrder.totalAmount.toFixed(2)}`, 18) + '\n';
        invoice += '\n';
      });

      // Grand total
      invoice += line + '\n';
      invoice += this.centerText('GRAND TOTAL', lineWidth) + '\n';
      invoice += line + '\n';
      invoice += this.padRight('', lineWidth - 32) + this.padRight('Total Amount:', 14) + this.padRight(`₹${order.totalAmount.toFixed(2)}`, 18) + '\n';
      invoice += this.padRight('', lineWidth - 32) + this.padRight('Delivery:', 14) + this.padRight('FREE', 18) + '\n';
      invoice += line + '\n\n';
    } else {
      // Single-retailer order (backward compatibility)
      const retailerInfo: any = order.retailerId;
      const retailerName = retailerInfo?.businessName || retailerInfo?.profile?.name || 'Unknown Retailer';
      const retailerEmail = retailerInfo?.email || '';

      invoice += dashLine + '\n';
      invoice += this.centerText('BILL FROM', lineWidth) + '\n';
      invoice += dashLine + '\n';
      invoice += `Retailer:  ${retailerName}\n`;
      if (retailerEmail) {
        invoice += `Email:     ${retailerEmail}\n`;
      }
      invoice += '\n';

      // Items Table
      invoice += dashLine + '\n';
      invoice += this.centerText('ORDER ITEMS', lineWidth) + '\n';
      invoice += dashLine + '\n';
      invoice += this.padRight('ITEM', 40) + this.padRight('QTY', 8) + this.padRight('PRICE', 14) + this.padRight('TOTAL', 18) + '\n';
      invoice += dashLine + '\n';

      (order.items || []).forEach((item: any) => {
        const itemName = item.name.length > 37 ? item.name.substring(0, 37) + '...' : item.name;
        invoice += this.padRight(itemName, 40);
        invoice += this.padRight(item.quantity.toString(), 8);
        invoice += this.padRight(`₹${item.unitPrice.toFixed(2)}`, 14);
        invoice += this.padRight(`₹${item.subtotal.toFixed(2)}`, 18);
        invoice += '\n';
      });

      invoice += dashLine + '\n';

      // Totals
      invoice += this.padRight('', lineWidth - 32) + this.padRight('Subtotal:', 14) + this.padRight(`₹${order.totalAmount.toFixed(2)}`, 18) + '\n';
      invoice += this.padRight('', lineWidth - 32) + this.padRight('Delivery:', 14) + this.padRight('FREE', 18) + '\n';
      invoice += dashLine + '\n';
      invoice += this.padRight('', lineWidth - 32) + this.padRight('TOTAL:', 14) + this.padRight(`₹${order.totalAmount.toFixed(2)}`, 18) + '\n';
      invoice += line + '\n\n';
    }

    // Footer
    if (order.notes) {
      invoice += 'Notes:\n';
      invoice += order.notes + '\n\n';
    }

    invoice += this.centerText('Thank you for your business!', lineWidth) + '\n';
    invoice += this.centerText('For support: support@livemart.com', lineWidth) + '\n';
    invoice += line + '\n';

    return invoice;
  }

  /**
   * Format retailer invoice (shows only their specific sub-order)
   */
  private formatRetailerInvoice(
    order: IOrder,
    subOrder: ISubOrder | undefined,
    customerName: string,
    customerEmail: string,
    retailerName: string,
    retailerEmail: string
  ): string {
    const lineWidth = 80;
    const line = '='.repeat(lineWidth);
    const dashLine = '-'.repeat(lineWidth);

    let invoice = '';

    // Header
    invoice += line + '\n';
    invoice += this.centerText('RETAILER INVOICE', lineWidth) + '\n';
    invoice += this.centerText('Live MART - Online Delivery System', lineWidth) + '\n';
    invoice += line + '\n\n';

    // Invoice Details
    const invoiceNumber = subOrder?.subOrderId || order.orderId;
    const invoiceStatus = subOrder?.status || order.status;
    const paymentStatus = subOrder?.paymentStatus || order.paymentStatus;

    invoice += `Invoice Number:  ${invoiceNumber}\n`;
    invoice += `Master Order:    ${order.orderId}\n`;
    invoice += `Invoice Date:    ${new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}\n`;
    invoice += `Order Status:    ${invoiceStatus}\n`;
    invoice += `Payment Status:  ${paymentStatus}\n`;
    invoice += `Payment Method:  COD (Cash on Delivery)\n\n`;

    invoice += dashLine + '\n';
    invoice += this.centerText('BILL TO (CUSTOMER)', lineWidth) + '\n';
    invoice += dashLine + '\n';
    invoice += `Customer:  ${customerName}\n`;
    invoice += `Email:     ${customerEmail}\n`;
    invoice += `Address:   ${order.deliveryAddress.street}\n`;
    invoice += `           ${order.deliveryAddress.city}, ${order.deliveryAddress.state}\n`;
    invoice += `           ${order.deliveryAddress.zipCode}, ${order.deliveryAddress.country}\n\n`;

    invoice += dashLine + '\n';
    invoice += this.centerText('BILL FROM (YOUR BUSINESS)', lineWidth) + '\n';
    invoice += dashLine + '\n';
    invoice += `Retailer:  ${retailerName}\n`;
    invoice += `Email:     ${retailerEmail}\n\n`;

    // Items Table
    invoice += dashLine + '\n';
    invoice += this.centerText('ORDER ITEMS', lineWidth) + '\n';
    invoice += dashLine + '\n';
    invoice += this.padRight('ITEM', 40) + this.padRight('QTY', 8) + this.padRight('PRICE', 14) + this.padRight('TOTAL', 18) + '\n';
    invoice += dashLine + '\n';

    const items = subOrder?.items || order.items || [];
    items.forEach((item: any) => {
      const itemName = item.name.length > 37 ? item.name.substring(0, 37) + '...' : item.name;
      invoice += this.padRight(itemName, 40);
      invoice += this.padRight(item.quantity.toString(), 8);
      invoice += this.padRight(`₹${item.unitPrice.toFixed(2)}`, 14);
      invoice += this.padRight(`₹${item.subtotal.toFixed(2)}`, 18);
      invoice += '\n';
    });

    invoice += dashLine + '\n';

    // Totals
    const subtotalAfterDiscounts = subOrder?.subtotalAfterProductDiscounts || order.totalAmount;
    const tierCodeDiscount = subOrder?.tierCodeDiscountShare || 0;
    const totalAmount = subOrder?.totalAmount || order.totalAmount;

    invoice += this.padRight('', lineWidth - 32) + this.padRight('Subtotal:', 14) + this.padRight(`₹${subtotalAfterDiscounts.toFixed(2)}`, 18) + '\n';

    if (tierCodeDiscount > 0) {
      invoice += this.padRight('', lineWidth - 32) + this.padRight('Discount:', 14) + this.padRight(`-₹${tierCodeDiscount.toFixed(2)}`, 18) + '\n';
    }

    invoice += this.padRight('', lineWidth - 32) + this.padRight('Delivery:', 14) + this.padRight('FREE', 18) + '\n';
    invoice += dashLine + '\n';
    invoice += this.padRight('', lineWidth - 32) + this.padRight('TOTAL:', 14) + this.padRight(`₹${totalAmount.toFixed(2)}`, 18) + '\n';
    invoice += line + '\n\n';

    // Additional info for retailer
    if (subOrder) {
      invoice += dashLine + '\n';
      invoice += this.centerText('PAYMENT COLLECTION INFO', lineWidth) + '\n';
      invoice += dashLine + '\n';
      invoice += `Your portion of this order: ₹${totalAmount.toFixed(2)}\n`;
      invoice += `Payment Status: ${paymentStatus}\n`;
      if (paymentStatus === 'PENDING') {
        invoice += `⚠️  Remember to collect payment and mark as paid in your dashboard.\n`;
      } else if (paymentStatus === 'COMPLETED') {
        invoice += `✅ Payment has been collected for this order.\n`;
      }
      invoice += '\n';
    }

    // Footer
    if (order.notes) {
      invoice += 'Customer Notes:\n';
      invoice += order.notes + '\n\n';
    }

    invoice += this.centerText('Thank you for your business!', lineWidth) + '\n';
    invoice += this.centerText('For support: support@livemart.com', lineWidth) + '\n';
    invoice += line + '\n';

    return invoice;
  }

  /**
   * Helper: Center text within a given width
   */
  private centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  /**
   * Helper: Pad text to the right
   */
  private padRight(text: string, width: number): string {
    return text + ' '.repeat(Math.max(0, width - text.length));
  }
}

export default new InvoiceService();
