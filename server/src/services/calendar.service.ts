import { IOrder, ISubOrder } from '../models/Order.model';
import { logger } from '../utils/logger';

/**
 * Calendar Service
 * Generates .ics calendar files for shipping notifications
 */

class CalendarService {
  /**
   * Generate .ics file content for a shipping event
   * @param order - The main order
   * @param subOrder - The specific sub-order with shipping date
   * @param customerName - Customer's name
   * @param customerEmail - Customer's email
   * @param retailerName - Retailer's business name
   * @returns iCalendar formatted string (.ics content)
   */
  generateShippingCalendarEvent(
    order: IOrder,
    subOrder: ISubOrder,
    customerName: string,
    customerEmail: string,
    retailerName: string
  ): string {
    if (!subOrder.expectedShippingDate) {
      throw new Error('Expected shipping date is required to generate calendar event');
    }

    // Format date for iCalendar (YYYYMMDDTHHmmssZ)
    const formatICalDate = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    };

    // Create item list
    const itemList = subOrder.items
      .map(item => `${item.name} (x${item.quantity})`)
      .join(', ');

    // Event details
    const shippingDate = new Date(subOrder.expectedShippingDate);
    const eventStart = formatICalDate(shippingDate);

    // Set event duration to 1 hour (arbitrary, for all-day event)
    const eventEnd = formatICalDate(new Date(shippingDate.getTime() + 60 * 60 * 1000));

    const now = formatICalDate(new Date());

    // Generate unique ID for the event
    const uid = `${order.orderId}-${subOrder.subOrderId}@livemart.com`;

    // Build .ics content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Live MART//Order Shipping Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Live MART Shipping',
      'X-WR-TIMEZONE:Asia/Kolkata',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${eventStart}`,
      `DTEND:${eventEnd}`,
      `SUMMARY:📦 Order ${subOrder.subOrderId} - Shipping from ${retailerName}`,
      `DESCRIPTION:Your order items will be shipped on this date.\\n\\nItems: ${itemList}\\n\\nOrder ID: ${order.orderId}\\nSub-Order ID: ${subOrder.subOrderId}\\nRetailer: ${retailerName}\\n\\nDelivery Address:\\n${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.zipCode}`,
      `LOCATION:${retailerName}`,
      `ORGANIZER;CN=${retailerName}:mailto:noreply@livemart.com`,
      `ATTENDEE;CN=${customerName};RSVP=FALSE:mailto:${customerEmail}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT24H',
      'DESCRIPTION:Reminder: Your order will be shipped tomorrow',
      'ACTION:DISPLAY',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    logger.info(`📅 Generated calendar event for sub-order ${subOrder.subOrderId}`);
    return icsContent;
  }

  /**
   * Generate filename for the .ics file
   */
  generateFilename(orderId: string, subOrderId: string): string {
    return `LiveMART-Shipping-${subOrderId}.ics`;
  }
}

export default new CalendarService();
