export interface FormFieldDescriptor {
  id: string;
  tagName: string;
  type: string;
  name: string;
  label: string;
  placeholder: string;
  autocomplete: string;
  options: string[];
}

// Popup → Background
export interface StartAutofillMessage {
  type: 'START_AUTOFILL';
}

// Background → Content
export interface ScanAndFillMessage {
  type: 'SCAN_AND_FILL';
}

// Content → Background
export interface AutofillRequestMessage {
  type: 'AUTOFILL_REQUEST';
  fields: FormFieldDescriptor[];
}

// Background → Content
export interface AutofillResponseMessage {
  type: 'AUTOFILL_RESPONSE';
  mapping: Record<string, string>;
}

// Content → Background / Background → Popup
export interface AutofillResultMessage {
  type: 'AUTOFILL_RESULT';
  success: boolean;
  filledCount: number;
  error?: string;
}

export type ExtensionMessage =
  | StartAutofillMessage
  | ScanAndFillMessage
  | AutofillRequestMessage
  | AutofillResponseMessage
  | AutofillResultMessage;
