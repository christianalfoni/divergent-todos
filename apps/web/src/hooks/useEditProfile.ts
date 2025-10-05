import { pipe } from "pipesy";
import { profilesCollection, type Profile } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useAuthentication } from "./useAuthentication";
import { useRef } from "react";

export type EditProfileState =
  | {
      isEditing: true;
      error: null;
    }
  | {
      isEditing: false;
      error: null;
    }
  | {
      isEditing: false;
      error: string;
    };

export function useEditProfile() {
  const authentication = useAuthentication();
  const userRef = useRef(authentication.user);

  userRef.current = authentication.user;

  return pipe<EditProfileState, Partial<Profile>>()
    .setState({ isEditing: true, error: null })
    .async((updates) => {
      if (!userRef.current) {
        throw new Error("can not edit profile without a user");
      }

      const profileDoc = doc(profilesCollection, userRef.current.uid);

      // Use setDoc with merge to update only the fields provided
      return setDoc(profileDoc, updates, { merge: true });
    })
    .map(() => ({ isEditing: false, error: null }))
    .catch((err) => ({ isEditing: false, error: String(err) }))
    .use({ isEditing: false, error: null });
}
