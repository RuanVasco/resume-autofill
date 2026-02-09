import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  constructor() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
        'assets/pdf.worker.min.js',
      );
    }
  }

  async extractText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items.map((item: any) => item.str).join(' ');

      fullText += pageText + '\n';
    }

    return fullText;
  }
}
