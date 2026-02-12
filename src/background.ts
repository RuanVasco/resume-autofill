import type {
  ExtensionMessage,
  AutofillRequestMessage,
  AutofillResultMessage,
} from './shared/messages';

const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'START_AUTOFILL') {
      handleStartAutofill().then(sendResponse);
      return true;
    }

    if (message.type === 'AUTOFILL_REQUEST') {
      handleAutofillRequest(message).then(sendResponse);
      return true;
    }

    return false;
  },
);

async function handleStartAutofill(): Promise<AutofillResultMessage> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) {
      return {
        type: 'AUTOFILL_RESULT',
        success: false,
        filledCount: 0,
        error: 'Nenhuma aba ativa encontrada.',
      };
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });

    const response = await sendMessageWithRetry(tab.id, {
      type: 'SCAN_AND_FILL',
    } as ExtensionMessage);
    return response as AutofillResultMessage;
  } catch (error) {
    return {
      type: 'AUTOFILL_RESULT',
      success: false,
      filledCount: 0,
      error: `Erro ao iniciar autofill: ${(error as Error).message}`,
    };
  }
}

async function sendMessageWithRetry(
  tabId: number,
  message: ExtensionMessage,
  retries = 5,
  delay = 100,
): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch {
      if (i === retries - 1)
        throw new Error(
          'Content script não respondeu. Recarregue a página e tente novamente.',
        );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function handleAutofillRequest(
  message: AutofillRequestMessage,
): Promise<{ type: 'AUTOFILL_RESPONSE'; mapping: Record<string, string> }> {
  const { resume_content: resume } =
    await chrome.storage.local.get('resume_content');
  const { gemini_api_key: apiKey } =
    await chrome.storage.local.get('gemini_api_key');
  const { gemini_model: model } =
    await chrome.storage.local.get('gemini_model');

  if (!resume || !apiKey) {
    return { type: 'AUTOFILL_RESPONSE', mapping: {} };
  }

  const selectedModel = model || DEFAULT_MODEL;
  const geminiApiUrl = `${GEMINI_API_BASE}/${selectedModel}:generateContent`;

  const fieldsDescription = message.fields
    .map((f) => {
      let desc = `- id="${f.id}", tag=${f.tagName}, type=${f.type}, name="${f.name}", label="${f.label}"`;
      if (f.placeholder) desc += `, placeholder="${f.placeholder}"`;
      if (f.autocomplete) desc += `, autocomplete="${f.autocomplete}"`;
      if (f.options.length > 0) desc += `, options=[${f.options.join(', ')}]`;
      return desc;
    })
    .join('\n');

  const prompt = `You are an assistant that fills out job application forms using data from a resume.

Below is the resume content:
---
${resume}
---

Below are the form fields found on the page:
${fieldsDescription}

Your task: map each field to the most appropriate value from the resume.
- Use the field's label, name, placeholder, autocomplete attribute, and type to determine what data it expects.
- For select fields, pick from the available options.
- If a field cannot be confidently mapped, omit it from the result.
- Return ONLY a JSON object where keys are field IDs and values are the strings to fill in.
- Do NOT include any explanation, only the JSON.`;

  try {
    const response = await fetch(`${geminiApiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini API error:', response.status, errorBody);
      return { type: 'AUTOFILL_RESPONSE', mapping: {} };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('Gemini returned empty response');
      return { type: 'AUTOFILL_RESPONSE', mapping: {} };
    }

    const mapping = JSON.parse(text) as Record<string, string>;
    return { type: 'AUTOFILL_RESPONSE', mapping };
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return { type: 'AUTOFILL_RESPONSE', mapping: {} };
  }
}
