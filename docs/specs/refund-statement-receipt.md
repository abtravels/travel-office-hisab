# Refund, client statement, payment receipt, print lines (v3.45)

## Behavior

### Refund / void
- A sale can carry one refund. The refund has a date, the amount the airline or supplier returns, and the amount credited to the client.
- The supplier amount cannot be more than the cost price. The client amount cannot be more than the client price after the change adjustment.
- A refund needs a sale with both cost and sale price.
- Client payable after refund = sale - adj - client refund.
- Supplier cost after refund = cost - adj - supplier refund.
- Profit after refund = sale - cost + supplier refund - client refund.
- "Due from supplier" = supplier refund - amounts received from the supplier.
- "Due to client" = the part of the client refund that the client already paid, minus amounts given back.
- The app records money received from the supplier and money given to the client, each with a date.
- Open refunds show on the Pending Payments tab until both sides are settled.
- Removing the refund restores the sale to its earlier numbers.

### Client statement
- Each client has a statement: every sale, payment, refund and pending entry in date order with a running balance.
- A positive balance means the client owes money. A negative balance means the office owes the client.
- The statement prints on A4 and has a WhatsApp summary with the open items.

### Payment receipt
- After a payment is saved, the app offers a WhatsApp receipt with the amount, date, total, total received and remaining balance.

### Pending age
- Pending Payments shows the pending amount in three groups: 0-7 days, 8-30 days, more than 30 days.
- Each pending item older than 7 days shows its age.

### Invoice print lines
- On paper, box borders and row lines of the invoice are dark enough to print.
- The on-screen invoice does not change.

## Acceptance criteria
- Sale 50,000, cost 47,000, paid. Refund: supplier 40,000, client 38,000. Result: profit 5,000, due from supplier 40,000, due to client 38,000, client pending 0.
- Same sale unpaid with 20,000 received. Result: client pending 0, due to client 8,000.
- Same sale unpaid with nothing received. Result: client pending 12,000, due to client 0.
- A sale without a refund gives the same numbers as v3.44.
- The statement closing balance equals pending minus refund due to the client.
- The print copy contains no `#e5e7eb`, `#f3f4f6`, `#f1f5f9` or `#cbd5e1` border.

## Assumptions
- The refund is stored on the sale (`ticket.refund`), not as a new sale type. Reason: v3.36 fixed the sale types to four, and a refund is an event on an existing sale.
- The refund changes the profit of the month of the sale date. Reason: this is how an edit of cost or sale already behaves. A month that is already split keeps its posted split until "Re-apply split".
- The amount received from the client is saved when the refund is created (`refund.recv`). Reason: a "Paid" sale may have no payment rows, so the amount cannot be derived later.
- The receipt is a WhatsApp text, not a numbered document. Reason: the app has no receipt numbering, and adding one is a schema change.
- The WhatsApp statement lists open items only. Reason: a full ledger can exceed the length of a WhatsApp link. The printed statement has the full ledger.
- Dark lines apply to the print copy only. Reason: the task names the printout. The shared PDF and the screen keep the current look.
- The staff portal is not changed. It computes the remaining balance from the sale price and does not know the refund.
