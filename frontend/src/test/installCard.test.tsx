import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { InstallCard } from '../components/pwa';
import i18n from '../i18n';

let displayMode: MediaQueryList;
function offerInstall(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  const prompt = vi.fn().mockResolvedValue(undefined);
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome, platform: 'web' }) });
  act(() => window.dispatchEvent(event));
  return { event, prompt };
}

beforeEach(() => {
  sessionStorage.clear();
  const target = new EventTarget();
  displayMode = Object.assign(target, {
    matches: false,
    media: '(display-mode: standalone)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: target.dispatchEvent.bind(target),
  }) as MediaQueryList;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => displayMode)
  );
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android Chrome');
});
afterEach(async () => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'maxTouchPoints');
  await i18n.changeLanguage('en');
});

describe('PWA install card F-107', () => {
  it('stays hidden without a browser install offer and does not prompt automatically', () => {
    const { container } = render(<InstallCard />);
    expect(container).toBeEmptyDOMElement();
    const { event, prompt } = offerInstall();
    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole('button', { name: 'Install app' })).toBeInTheDocument();
    expect(prompt).not.toHaveBeenCalled();
  });

  it.each(['accepted', 'dismissed'] as const)('consumes the event once on %s', async (outcome) => {
    const { container } = render(<InstallCard />);
    const { prompt } = offerInstall(outcome);
    fireEvent.click(screen.getByRole('button', { name: 'Install app' }));
    expect(prompt).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('prevents duplicate prompts while waiting for user choice', async () => {
    render(<InstallCard />);
    let resolveChoice!: (value: { outcome: 'accepted'; platform: string }) => void;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    const prompt = vi.fn().mockResolvedValue(undefined);
    Object.assign(event, {
      prompt,
      userChoice: new Promise((resolve) => {
        resolveChoice = resolve;
      }),
    });
    act(() => window.dispatchEvent(event));
    fireEvent.click(screen.getByRole('button', { name: 'Install app' }));
    expect(screen.getByRole('button', { name: 'Waiting for your choice…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Waiting for your choice…' }));
    expect(prompt).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveChoice({ outcome: 'accepted', platform: 'web' });
    });
  });

  it('hides after installation from another browser UI', () => {
    const { container } = render(<InstallCard />);
    offerInstall();
    act(() => window.dispatchEvent(new Event('appinstalled')));
    expect(container).toBeEmptyDOMElement();
  });

  it('hides in standalone mode and handles display mode changes', () => {
    Object.defineProperty(displayMode, 'matches', { value: true, configurable: true });
    const first = render(<InstallCard />);
    const { event } = offerInstall();
    expect(event.defaultPrevented).toBe(false);
    expect(first.container).toBeEmptyDOMElement();
    first.unmount();
    Object.defineProperty(displayMode, 'matches', { value: false, configurable: true });
    const second = render(<InstallCard />);
    offerInstall();
    const change = new Event('change');
    Object.assign(change, { matches: true });
    act(() => displayMode.dispatchEvent(change));
    expect(second.container).toBeEmptyDOMElement();
  });

  it('remembers Not now for the tab session and lets later native offers proceed', () => {
    const first = render(<InstallCard />);
    offerInstall();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(first.container).toBeEmptyDOMElement();
    expect(offerInstall().event.defaultPrevented).toBe(false);
    first.unmount();
    const second = render(<InstallCard />);
    expect(offerInstall().event.defaultPrevented).toBe(false);
    expect(second.container).toBeEmptyDOMElement();
  });

  it('shows manual steps for iOS Safari without a fake Install button', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla iPhone Version/18.0 Mobile Safari/604.1'
    );
    render(<InstallCard />);
    expect(screen.getByRole('heading', { name: 'Install OmoBridge' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText(/Choose Add to Home Screen/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
  });

  it('does not present Safari-specific steps in iOS Chrome', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla iPhone CriOS/120.0 Mobile Safari/604.1'
    );
    const { container } = render(<InstallCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('supports iPad desktop user agents and legacy iOS standalone detection', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla Macintosh Version/18.0 Safari/605.1'
    );
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
    const first = render(<InstallCard />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    first.unmount();
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    try {
      expect(render(<InstallCard />).container).toBeEmptyDOMElement();
    } finally {
      Reflect.deleteProperty(navigator, 'standalone');
    }
  });

  it('shows a safe error when prompt fails and accepts a fresh browser offer', async () => {
    render(<InstallCard />);
    const { prompt } = offerInstall();
    prompt.mockRejectedValueOnce(new Error('Not allowed'));
    fireEvent.click(screen.getByRole('button', { name: 'Install app' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not open');
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
    offerInstall();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Install app' })).toBeInTheDocument();
  });

  it('works with unavailable storage and cleans up event handlers on unmount', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const view = render(<InstallCard />);
    offerInstall();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(view.container).toBeEmptyDOMElement();
    view.unmount();
    expect(offerInstall().event.defaultPrevented).toBe(false);
  });

  it('supports Amharic fallback and semantic accessibility', async () => {
    await i18n.changeLanguage('fr');
    const { container } = render(
      <main>
        <InstallCard />
      </main>
    );
    offerInstall();
    expect(screen.getByRole('heading', { name: 'OmoBridgeን ይጫኑ' })).toBeInTheDocument();
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
