import {
  type FirestoreDataConverter,
  QueryDocumentSnapshot,
  type SnapshotOptions,
  Timestamp,
} from "firebase/firestore";

// Payment type definition
export interface Payment {
  amount: number;
  currency: string;
  invoiceId: string;
  paymentIntentId: string | null;
  subscriptionId: string | null;
  created: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
  status: string | null;
  description: string | null;
}

// Firestore data format (with Timestamps instead of Dates)
interface PaymentFirestore {
  amount: number;
  currency: string;
  invoiceId: string;
  paymentIntentId: string | null;
  subscriptionId: string | null;
  created: Timestamp;
  periodStart: Timestamp | null;
  periodEnd: Timestamp | null;
  status: string | null;
  description: string | null;
}

// Firestore converter for Payment
export const paymentConverter: FirestoreDataConverter<Payment> = {
  toFirestore: (payment: Payment): PaymentFirestore => {
    return {
      amount: payment.amount,
      currency: payment.currency,
      invoiceId: payment.invoiceId,
      paymentIntentId: payment.paymentIntentId,
      subscriptionId: payment.subscriptionId,
      created: Timestamp.fromDate(payment.created),
      periodStart: payment.periodStart
        ? Timestamp.fromDate(payment.periodStart)
        : null,
      periodEnd: payment.periodEnd ? Timestamp.fromDate(payment.periodEnd) : null,
      status: payment.status,
      description: payment.description,
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot<PaymentFirestore>,
    options?: SnapshotOptions
  ): Payment => {
    const data = snapshot.data(options);
    return {
      amount: data.amount,
      currency: data.currency,
      invoiceId: data.invoiceId,
      paymentIntentId: data.paymentIntentId,
      subscriptionId: data.subscriptionId,
      created: data.created.toDate(),
      periodStart: data.periodStart ? data.periodStart.toDate() : null,
      periodEnd: data.periodEnd ? data.periodEnd.toDate() : null,
      status: data.status,
      description: data.description,
    };
  },
};
