import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider, useApp } from "@/contexts/AppContext";
import AppShell from "@/components/negolinks/AppShell";
import { Loading } from "@/components/negolinks/ui";
import "./styles/globals.css";

// Lazy-load all pages for code splitting
const Login        = lazy(() => import("@/pages/Login"));
const Dashboard    = lazy(() => import("@/pages/Dashboard"));
const Members      = lazy(() => import("@/pages/Members"));
const Savings      = lazy(() => import("@/pages/Savings"));
const Loans        = lazy(() => import("@/pages/Loans"));
const Finance      = lazy(() => import("@/pages/Finance"));
const Shares       = lazy(() => import("@/pages/Shares"));
const Investments  = lazy(() => import("@/pages/Investments"));
const Governance   = lazy(() => import("@/pages/Governance"));
const Procurement  = lazy(() => import("@/pages/Procurement"));
const Hr           = lazy(() => import("@/pages/Hr"));
const Communications = lazy(() => import("@/pages/Communications"));
const Reports      = lazy(() => import("@/pages/Reports"));
const Audit        = lazy(() => import("@/pages/Audit"));
const AIAssistant  = lazy(() => import("@/pages/AIAssistant"));
const AISettings   = lazy(() => import("@/pages/AISettings"));
const DemoData     = lazy(() => import("@/pages/DemoData"));
const SystemAdmin  = lazy(() => import("@/pages/SystemAdmin"));
const Settings     = lazy(() => import("@/pages/Settings"));

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

function Gate() {
  const { session } = useApp();
  if (!session) return <Suspense fallback={<Loading />}><Login /></Suspense>;
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Suspense fallback={<Loading />}><Dashboard /></Suspense>} />
        <Route path="members"       element={<Suspense fallback={<Loading />}><Members /></Suspense>} />
        <Route path="savings"       element={<Suspense fallback={<Loading />}><Savings /></Suspense>} />
        <Route path="loans"         element={<Suspense fallback={<Loading />}><Loans /></Suspense>} />
        <Route path="finance"       element={<Suspense fallback={<Loading />}><Finance /></Suspense>} />
        <Route path="shares"        element={<Suspense fallback={<Loading />}><Shares /></Suspense>} />
        <Route path="investments"   element={<Suspense fallback={<Loading />}><Investments /></Suspense>} />
        <Route path="governance"    element={<Suspense fallback={<Loading />}><Governance /></Suspense>} />
        <Route path="procurement"   element={<Suspense fallback={<Loading />}><Procurement /></Suspense>} />
        <Route path="hr"            element={<Suspense fallback={<Loading />}><Hr /></Suspense>} />
        <Route path="communications"element={<Suspense fallback={<Loading />}><Communications /></Suspense>} />
        <Route path="reports"       element={<Suspense fallback={<Loading />}><Reports /></Suspense>} />
        <Route path="audit"         element={<Suspense fallback={<Loading />}><Audit /></Suspense>} />
        <Route path="ai"            element={<Suspense fallback={<Loading />}><AIAssistant /></Suspense>} />
        <Route path="settings"      element={<Suspense fallback={<Loading />}><Settings /></Suspense>} />
        <Route path="settings/ai"   element={<Suspense fallback={<Loading />}><AISettings /></Suspense>} />
        <Route path="settings/demo" element={<Suspense fallback={<Loading />}><DemoData /></Suspense>} />
        <Route path="settings/system" element={<Suspense fallback={<Loading />}><SystemAdmin /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AppProvider>
          <Gate />
        </AppProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
