import { pipe } from "pipesy";
import { profilesCollection, type Profile } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuthentication } from "./useAuthentication";
import { useEffect } from "react";

export function useProfile() {
  const authentication = useAuthentication();

  const [profile, setProfile] = pipe<Profile | null>()
    .setState()
    .useCache("profile", null);

  useEffect(() => {
    if (!authentication.user) {
      return;
    }

    const profileDoc = doc(profilesCollection, authentication.user!.uid);

    return onSnapshot(
      profileDoc,
      { includeMetadataChanges: false },
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data({ serverTimestamps: "estimate" }));
        } else {
          setProfile(null);
        }
      }
    );
  }, [authentication.user, setProfile]);

  return profile;
}
