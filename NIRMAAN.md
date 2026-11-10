# NIRMAAN operations

See [README.md](README.md) for local setup, account creation, product pages, checkout, pricing and payment verification.

## Fulfillment checklist

1. Review the customer’s structured delivery address, print text, business logo, custom design and any ID photo through the admin order details.
2. Discuss the product, size, material, printing, menu work, quantity and delivery price with the customer on WhatsApp.
3. Send the agreed physical product/printing/delivery amount as an admin quote. Setup + the first service month (₹99 including GST) is added automatically.
4. Wait for customer acceptance of the total and order/payment terms. Only then request UPI payment.
5. Check the actual credit in the business UPI account; review the uploaded screenshot and confirm the verification checkbox before activating. A screenshot alone is not proof of receipt.
6. Confirm production-ready artwork with the customer. Generate the working QR code from the managed `/tap/<order-id>` URL and program the NFC tag. Sample QR illustrations on the website are not production codes.
7. Use the admin expired-plans filter to see service renewals due. Paid renewal approval extends only the selected product. Historical renewal records are not counted as expired subscriptions.

UPI details can be added later in the admin dashboard. Customer cancellation is unavailable; confirmed orders cannot be cancelled and payments are non-refundable, subject to mandatory legal rights.

## Design and student ID fulfillment

- The selected template is stored as `designTemplate`; customer-uploaded artwork is stored privately and referenced by `designId`. Confirm the final physical print proof even when a template is chosen.
- Student-portal ID cards need separate student assignments after activation. Open `/institution`, enter the assigned sign-in email and the institution-provided results, fee amounts and attendance counts.
- Program each card with its own `/tap/<order-id>?student=<record-id>` URL shown in the institution desk. For multi-ID orders, do not program all cards with the bare shared order URL.
- Student data is never shown anonymously. Institution access and the assigned student email are checked on the server; a QR link is not an authentication credential.
- Attendance counts and fee-paid records are maintained by the institution. Verify source records before entering them; tapping does not automatically mark attendance or verify a tuition payment.
