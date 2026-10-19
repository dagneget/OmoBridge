import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

export async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_USE_MOCKS === 'false') {
    return;
  }
  await worker.start();
}
