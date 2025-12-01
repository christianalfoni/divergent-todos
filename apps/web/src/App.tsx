import { useCatchError, useState } from "rask-ui";
import MobileBlocker from "./MobileBlocker";
// import Terms from "./Terms";
// import { OnboardingProvider } from "./contexts/OnboardingContext";
import { useDevice } from "./hooks/useDevice";
import { ErrorFeedback } from "./ErrorFeedback";

export function App() {
  const device = useDevice();
  const globalError = useCatchError();

  return () => {
    if (globalError.error) {
      return <ErrorFeedback error={globalError.error} />;
    }

    // Check if device is mobile and show blocker if so
    if (device.isMobile) {
      return <MobileBlocker />;
    }

    return null;

    // In Electron, skip the router entirely

    if (device.isElectron) {
      return <AppContent />;
    }

    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/terms" element={<Terms />} />
        </Routes>
      </BrowserRouter>
    );
  };
}
