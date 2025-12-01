import { pipe } from "pipesy";
import { profilesCollection, type Profile } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useAuthentication } from "../contexts/AuthenticationContext";
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
  const [authentication, setAuthentication] = useAuthentication();
  const userRef = useRef(authentication.user);

  userRef.current = authentication.user;

  return pipe<Partial<Profile>, EditProfileState>()
    .setState({ isEditing: true, error: null })
    .map((updates) => {
      // Optimistic update
      setAuthentication((currentAuth) => {
        if (!currentAuth.user) return currentAuth;
        return {
          ...currentAuth,
          profile: currentAuth.profile
            ? { ...currentAuth.profile, ...updates }
            : (updates as Profile),
        };
      });

      return updates;
    })
    .async(async (updates) => {
      if (!userRef.current) {
        throw new Error("can not edit profile without a user");
      }

      const profileDoc = doc(profilesCollection, userRef.current.uid);

      // Use setDoc with merge to update only the fields provided
      await setDoc(profileDoc, updates, { merge: true });
    })
    .map(() => ({ isEditing: false, error: null }))
    .catch((err) => ({ isEditing: false, error: String(err) }))
    .use({ isEditing: false, error: null });
}
