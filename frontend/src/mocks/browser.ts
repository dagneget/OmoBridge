export async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return;
  const [{ setupWorker }, { handlers }] = await Promise.all([
    import('msw/browser'),
    import('./handlers'),
  ]);
  await setupWorker(...handlers).start();
}
