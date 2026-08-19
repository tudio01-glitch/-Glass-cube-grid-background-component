import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

const LabPage = lazy(() => import('./lab/LabPage'));
const HomePage = lazy(() => import('./HomePage'));

const isLab = window.location.pathname.startsWith('/lab');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>{isLab ? <LabPage /> : <HomePage />}</Suspense>
  </StrictMode>,
);
