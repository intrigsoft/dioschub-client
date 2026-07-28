import { createDiosc } from '../create-diosc';

/**
 * Unit tests for the createDiosc() instance wrapper.
 *
 * Strategy: run with `autoLoad: false` and a pre-seeded mock `window.diosc`, so
 * no <script> is injected and every instance method's forwarding is observable
 * on the mock. `__DIOSC_ASSISTANT_LOADED__ = true` makes `ready` resolve at once.
 */
describe('createDiosc', () => {
  let raw: jest.Mock;

  beforeEach(() => {
    raw = jest.fn();
    (window as unknown as { diosc: unknown }).diosc = raw;
    (window as unknown as { __DIOSC_ASSISTANT_LOADED__: boolean }).__DIOSC_ASSISTANT_LOADED__ = true;
  });

  afterEach(() => {
    delete (window as unknown as { diosc?: unknown }).diosc;
    delete (window as unknown as { __DIOSC_ASSISTANT_LOADED__?: boolean }).__DIOSC_ASSISTANT_LOADED__;
    jest.restoreAllMocks();
  });

  const make = (opts: Record<string, unknown> = {}) =>
    createDiosc({ apiKey: 'ak', backendUrl: 'https://hub', autoLoad: false, ...opts });

  describe('configuration', () => {
    it('forwards config and defaults autoConnect to true', () => {
      make();
      expect(raw).toHaveBeenCalledWith('config', expect.objectContaining({
        autoConnect: true,
        apiKey: 'ak',
        backendUrl: 'https://hub',
      }));
    });

    it('strips loader-only options (autoLoad / scriptUrl) from the config payload', () => {
      make({ scriptUrl: 'https://x/kit.js' });
      const config = raw.mock.calls[0][1] as Record<string, unknown>;
      expect(config).not.toHaveProperty('autoLoad');
      expect(config).not.toHaveProperty('scriptUrl');
    });

    it('lets the host override autoConnect', () => {
      make({ autoConnect: false });
      expect((raw.mock.calls[0][1] as { autoConnect: boolean }).autoConnect).toBe(false);
    });
  });

  describe('core', () => {
    it('send forwards pageContext but NOT attachments (engine gap)', () => {
      const d = make();
      raw.mockClear();
      d.send('hi', { pageContext: { x: 1 }, attachments: [{ id: 'f' }] });
      expect(raw).toHaveBeenCalledWith('invoke', 'hi', { x: 1 });
      // attachments deliberately dropped — only 3 args reach the doorway
      expect(raw.mock.calls[0]).toHaveLength(3);
    });

    it('connect / disconnect / cancelStream / fetchAssistantConfig map to commands', () => {
      const d = make();
      raw.mockClear();
      d.connect();
      d.disconnect();
      d.cancelStream();
      d.fetchAssistantConfig();
      expect(raw.mock.calls.map((c) => c[0])).toEqual([
        'connect', 'disconnect', 'cancelStream', 'fetchAssistantConfig',
      ]);
    });

    it('on / onAny forward to the event commands', () => {
      const d = make();
      raw.mockClear();
      const h = jest.fn();
      d.on('stream:chunk', h);
      d.onAny(h);
      expect(raw).toHaveBeenCalledWith('on', 'stream:chunk', h);
      expect(raw).toHaveBeenCalledWith('onAny', h);
    });

    it('ready resolves', async () => {
      await expect(make().ready).resolves.toBeUndefined();
    });
  });

  describe('ui namespace', () => {
    it('maps open/close/toggle/setPosition', () => {
      const d = make();
      raw.mockClear();
      d.ui.open();
      d.ui.close();
      d.ui.toggle();
      d.ui.setPosition('bottom-left');
      expect(raw.mock.calls).toEqual([
        ['open'], ['close'], ['toggle'], ['setPosition', 'bottom-left'],
      ]);
    });

    it('onOpenChange / onPositionChange forward to the doorway commands', () => {
      const d = make();
      raw.mockClear();
      const l1 = jest.fn();
      const l2 = jest.fn();
      d.ui.onOpenChange(l1);
      d.ui.onPositionChange(l2);
      expect(raw).toHaveBeenCalledWith('onOpenChange', l1);
      expect(raw).toHaveBeenCalledWith('onPositionChange', l2);
    });
  });

  describe('extend namespace', () => {
    it('maps tool/mentions/browser/onApproval/observeNavigation', () => {
      const d = make();
      raw.mockClear();
      const fn = jest.fn();
      const adapter = { read: jest.fn(), intents: [] };
      d.extend.tool('t', fn);
      d.extend.mentions(fn);
      d.extend.browser(adapter);
      d.extend.onApproval(/acme_/, fn);
      d.extend.observeNavigation(fn);
      expect(raw).toHaveBeenCalledWith('tool', 't', fn);
      expect(raw).toHaveBeenCalledWith('mentionProvider', fn);
      expect(raw).toHaveBeenCalledWith('browserAdapter', adapter);
      expect(raw).toHaveBeenCalledWith('approvalHandler', /acme_/, fn);
      expect(raw).toHaveBeenCalledWith('observe', 'navigation', fn);
    });
  });

  describe('identity namespace', () => {
    it('maps setBindHeaders and reauth', () => {
      const d = make();
      raw.mockClear();
      const factory = jest.fn();
      d.identity.setBindHeaders(factory);
      d.identity.reauth();
      expect(raw).toHaveBeenCalledWith('bindHeaders', factory);
      expect(raw).toHaveBeenCalledWith('reauth');
    });
  });

});
