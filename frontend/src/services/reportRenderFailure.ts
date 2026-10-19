// React passes the error and component stack to these callbacks. Deliberately ignore both.
export function reportRenderFailure(): void {
  console.error('Kinka page rendering failed.');
}
