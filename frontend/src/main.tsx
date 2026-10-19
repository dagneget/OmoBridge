import { reportRenderFailure } from './services/reportRenderFailure';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './i18n';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/queryClient';
import { enableMocking } from './mocks/browser';
import App from './App.tsx';

async function bootstrap() {
  await enableMocking();

  createRoot(document.getElementById('root')!, {
    onCaughtError: reportRenderFailure,
    onUncaughtError: reportRenderFailure,
    onRecoverableError: reportRenderFailure,
  }).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

bootstrap();
