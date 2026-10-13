/**
 * @jest-environment jsdom
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';

// jsdom does not ship structuredClone; the project seed module uses it at import time.
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (<T,>(v: T): T => JSON.parse(JSON.stringify(v))) as typeof structuredClone;
}

const { default: ComposeEmailModal } = await import('@/components/inbox/ComposeEmailModal');
const { VendorRequestModal } = await import('@/components/marketplace/VendorRequestModal');

// @ts-expect-error global flag for React 18/19
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setInputValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('Modals never report success when the backend call fails', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let fetchMock: jest.Mock<any>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.restoreAllMocks();
  });

  describe('ComposeEmailModal', () => {
    async function fillAndSend() {
      const doc = document.body;
      setInputValue(doc.querySelector('#compose-to-input') as HTMLInputElement, 'partner@firm.com');
      setInputValue(doc.querySelector('#compose-subject-input') as HTMLInputElement, 'Q3 review');
      setInputValue(doc.querySelector('#compose-body-textarea') as HTMLTextAreaElement, 'Numbers attached.');
      await flush();
      const sendBtn = Array.from(doc.querySelectorAll('button')).find((b) =>
        /send message/i.test(b.textContent || ''),
      ) as HTMLButtonElement;
      await act(async () => {
        sendBtn.click();
      });
      await flush();
    }

    it('shows an error and does not call onSent when the inbox API fails', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'write failed' }) });
      const onSent = jest.fn();
      act(() => {
        root.render(<ComposeEmailModal isOpen onClose={() => {}} onSent={onSent} />);
      });
      await flush();
      await fillAndSend();

      expect(onSent).not.toHaveBeenCalled();
      expect(document.body.textContent).not.toMatch(/sent successfully/i);
      expect(document.body.textContent).toMatch(/could not be saved/i);
    });

    it('shows an error when the network request throws', async () => {
      fetchMock.mockRejectedValue(new Error('offline'));
      const onSent = jest.fn();
      act(() => {
        root.render(<ComposeEmailModal isOpen onClose={() => {}} onSent={onSent} />);
      });
      await flush();
      await fillAndSend();

      expect(onSent).not.toHaveBeenCalled();
      expect(document.body.textContent).toMatch(/could not be saved/i);
    });

    it('never calls the nonexistent /api/contact route and does not claim an email went out', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({ success: true }) });
      const onSent = jest.fn();
      act(() => {
        root.render(<ComposeEmailModal isOpen onClose={() => {}} onSent={onSent} />);
      });
      await flush();
      await fillAndSend();

      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls).toEqual(['/api/inbox']);
      expect(onSent).toHaveBeenCalledTimes(1);
      expect(document.body.textContent).toMatch(/saved to your inbox/i);
      expect(document.body.textContent).not.toMatch(/sent successfully/i);
    });
  });

  describe('VendorRequestModal', () => {
    const vendor = { id: 'vendor-1', companyName: 'Ridge Line Builders', type: 'General Contractor' };

    async function fillAndSubmit() {
      const doc = document.body;
      const textInputs = Array.from(doc.querySelectorAll('input[type="text"], input:not([type])')) as HTMLInputElement[];
      setInputValue(textInputs[0], '1247 Elm Street rehab');
      const checkbox = doc.querySelector('input[type="checkbox"]') as HTMLInputElement;
      await act(async () => {
        checkbox.click();
      });
      const form = doc.querySelector('form') as HTMLFormElement;
      await act(async () => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      await flush();
    }

    it('shows an error and no confirmation when the API rejects the request', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'Firestore unavailable' }) });
      act(() => {
        root.render(<VendorRequestModal isOpen vendor={vendor} onClose={() => {}} />);
      });
      await flush();
      await fillAndSubmit();

      expect(document.body.textContent).not.toMatch(/quote request recorded/i);
      expect(document.body.textContent).toMatch(/Firestore unavailable|could not be sent/i);
    });

    it('confirms only after the API accepts the request', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({ success: true, request: { id: 'vreq-1' } }) });
      act(() => {
        root.render(<VendorRequestModal isOpen vendor={vendor} onClose={() => {}} />);
      });
      await flush();
      await fillAndSubmit();

      expect(fetchMock).toHaveBeenCalledWith('/api/vendors', expect.objectContaining({ method: 'POST' }));
      expect(document.body.textContent).toMatch(/quote request recorded/i);
    });
  });
});
