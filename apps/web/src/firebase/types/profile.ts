import {
  type FirestoreDataConverter,
  QueryDocumentSnapshot,
  type SnapshotOptions,
  Timestamp,
} from "firebase/firestore";

// Profile type definition
export interface Profile {
  theme?: string;
  subscription?: {
    customerId: string;
    subscriptionId: string | null;
    status:
      | "active"
      | "trialing"
      | "past_due"
      | "canceled"
      | "incomplete"
      | "incomplete_expired"
      | "unpaid"
      | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  };
}

// Firestore data format (with Timestamps instead of Dates)
interface ProfileFirestore {
  theme?: string;
  subscription?: {
    customerId: string;
    subscriptionId: string | null;
    status:
      | "active"
      | "trialing"
      | "past_due"
      | "canceled"
      | "incomplete"
      | "incomplete_expired"
      | "unpaid"
      | null;
    currentPeriodEnd: Timestamp | null;
    cancelAtPeriodEnd: boolean;
  };
}

// Firestore converter for Profile
export const profileConverter: FirestoreDataConverter<Profile> = {
  toFirestore: (profile: Profile): ProfileFirestore => {
    const result: ProfileFirestore = {};

    if (profile.theme !== undefined) {
      result.theme = profile.theme;
    }

    if (profile.subscription !== undefined) {
      result.subscription = {
        customerId: profile.subscription.customerId,
        subscriptionId: profile.subscription.subscriptionId,
        status: profile.subscription.status,
        currentPeriodEnd:
          profile.subscription.currentPeriodEnd !== null
            ? Timestamp.fromDate(profile.subscription.currentPeriodEnd)
            : null,
        cancelAtPeriodEnd: profile.subscription.cancelAtPeriodEnd,
      };
    }

    return result;
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot<ProfileFirestore>,
    options?: SnapshotOptions
  ): Profile => {
    const data = snapshot.data(options);
    const profile: Profile = {};

    if (data.theme !== undefined) {
      profile.theme = data.theme;
    }

    if (data.subscription !== undefined) {
      profile.subscription = {
        customerId: data.subscription.customerId,
        subscriptionId: data.subscription.subscriptionId,
        status: data.subscription.status,
        currentPeriodEnd:
          data.subscription.currentPeriodEnd !== null
            ? data.subscription.currentPeriodEnd.toDate()
            : null,
        cancelAtPeriodEnd: data.subscription.cancelAtPeriodEnd,
      };
    }

    return profile;
  },
};
