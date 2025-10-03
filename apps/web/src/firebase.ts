import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
// import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'

const firebaseConfig = {
  apiKey: "AIzaSyB-AL-doPbwouEQnPdhzal5E7QiEF10kX8",
  authDomain: "divergent-todos.firebaseapp.com",
  projectId: "divergent-todos",
  storageBucket: "divergent-todos.firebasestorage.app",
  messagingSenderId: "743678931261",
  appId: "1:743678931261:web:d27461ad19ffb981d49554",
  measurementId: "G-H7SMY53091",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Example callable usage:
// export const doPrivilegedThing = httpsCallable(functions, 'doPrivilegedThing')

/*
// App Check (optional; more common on web)
initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
})
*/
