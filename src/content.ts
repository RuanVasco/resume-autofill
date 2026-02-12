import type { ExtensionMessage, FormFieldDescriptor, AutofillResultMessage } from './shared/messages';

// Remove previous listener on re-injection (e.g. after extension reload)
if ((window as any).__RESUME_AUTOFILL_LISTENER__) {
  chrome.runtime.onMessage.removeListener((window as any).__RESUME_AUTOFILL_LISTENER__);
}

const listener = (message: ExtensionMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void): boolean | undefined => {
  if (message.type === 'SCAN_AND_FILL') {
    handleScanAndFill().then(sendResponse);
    return true;
  }
  return undefined;
};

(window as any).__RESUME_AUTOFILL_LISTENER__ = listener;
chrome.runtime.onMessage.addListener(listener);

async function handleScanAndFill(): Promise<AutofillResultMessage> {
  try {
    const fields = scanFormFields();

    if (fields.length === 0) {
      return { type: 'AUTOFILL_RESULT', success: false, filledCount: 0, error: 'Nenhum campo de formulário encontrado na página.' };
    }

    const response = await chrome.runtime.sendMessage({
      type: 'AUTOFILL_REQUEST',
      fields,
    } as ExtensionMessage);

    if (response?.type !== 'AUTOFILL_RESPONSE' || !response.mapping) {
      return { type: 'AUTOFILL_RESULT', success: false, filledCount: 0, error: 'Resposta inválida do Gemini.' };
    }

    const filledCount = fillFields(response.mapping);

    return { type: 'AUTOFILL_RESULT', success: true, filledCount };
  } catch (error) {
    return {
      type: 'AUTOFILL_RESULT',
      success: false,
      filledCount: 0,
      error: `Erro no content script: ${(error as Error).message}`,
    };
  }
}

function scanFormFields(): FormFieldDescriptor[] {
  const fields: FormFieldDescriptor[] = [];
  const SKIP_TYPES = new Set(['hidden', 'submit', 'button', 'file', 'checkbox', 'radio', 'image', 'reset']);

  const elements = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input, textarea, select'
  );

  let autoIdCounter = 0;

  elements.forEach((el) => {
    if (el instanceof HTMLInputElement && SKIP_TYPES.has(el.type)) return;
    if (el.closest('[hidden]') || el.offsetParent === null) return;

    if (!el.id) {
      el.id = `__autofill_field_${autoIdCounter++}`;
    }

    const descriptor: FormFieldDescriptor = {
      id: el.id,
      tagName: el.tagName.toLowerCase(),
      type: el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase(),
      name: el.name || '',
      label: detectLabel(el),
      placeholder: (el as HTMLInputElement).placeholder || '',
      autocomplete: el.autocomplete || '',
      options: [],
    };

    if (el instanceof HTMLSelectElement) {
      descriptor.options = Array.from(el.options)
        .filter((opt) => opt.value)
        .map((opt) => opt.text || opt.value);
    }

    fields.push(descriptor);
  });

  return fields;
}

function detectLabel(el: HTMLElement): string {
  // 1. <label for="id">
  if (el.id) {
    const labelEl = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(el.id)}"]`);
    if (labelEl?.textContent?.trim()) return labelEl.textContent.trim();
  }

  // 2. Parent <label>
  const parentLabel = el.closest('label');
  if (parentLabel?.textContent?.trim()) {
    return parentLabel.textContent.trim();
  }

  // 3. aria-labelledby
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const refEl = document.getElementById(labelledBy);
    if (refEl?.textContent?.trim()) return refEl.textContent.trim();
  }

  // 4. aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel?.trim()) return ariaLabel.trim();

  // 5. Previous sibling text
  const prev = el.previousElementSibling;
  if (prev?.textContent?.trim()) return prev.textContent.trim();

  return '';
}

function fillFields(mapping: Record<string, string>): number {
  let count = 0;

  for (const [fieldId, value] of Object.entries(mapping)) {
    const el = document.getElementById(fieldId) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    if (!el || !value) continue;

    if (el instanceof HTMLSelectElement) {
      const option = Array.from(el.options).find(
        (opt) => opt.text === value || opt.value === value
      );
      if (option) {
        el.value = option.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        count++;
      }
    } else {
      // Use native value setter for compatibility with React/Angular
      const nativeSetter = Object.getOwnPropertyDescriptor(
        el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value'
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(el, value);
      } else {
        el.value = value;
      }

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
      count++;
    }
  }

  return count;
}
