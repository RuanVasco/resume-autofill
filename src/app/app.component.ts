import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PdfService } from './services/pdf/pdf.service';
import { StorageService } from './services/storage/storage.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private pdfService = inject(PdfService);
  private storageService = inject(StorageService);
  private snackBar = inject(MatSnackBar);

  fileName = signal<string | null>(null);
  resumeContent = signal<string | null>(null);
  isLoading = signal(false);
  hasResume = computed(() => !!this.fileName());

  apiKey = signal<string | null>(null);
  apiKeyInput = signal('');
  isEditingApiKey = signal(false);
  hasApiKey = computed(() => !!this.apiKey());
  apiKeyMasked = computed(() => {
    const key = this.apiKey();
    if (!key || key.length < 8) return key ?? '';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  });

  constructor() {
    this.loadFromStorage();
  }

  private async loadFromStorage(): Promise<void> {
    const savedName = await this.storageService.get<string>('resume_filename');
    if (savedName) {
      this.fileName.set(savedName);
      const fullText = await this.storageService.get<string>('resume_content');
      this.resumeContent.set(fullText ?? null);
    }

    const savedKey = await this.storageService.get<string>('gemini_api_key');
    if (savedKey) {
      this.apiKey.set(savedKey);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (file.type !== 'application/pdf') {
      this.snackBar.open('Por favor, selecione apenas arquivos PDF.', 'OK', {
        duration: 3000,
      });
      return;
    }

    this.isLoading.set(true);
    this.fileName.set(file.name);

    try {
      const text = await this.pdfService.extractText(file);

      await this.storageService.set('resume_content', text);
      await this.storageService.set('resume_filename', file.name);

      this.resumeContent.set(text);

      this.snackBar.open('Currículo processado e salvo com sucesso!', 'Fechar', {
        duration: 3000,
      });
    } catch (error) {
      console.error('Erro ao processar:', error);
      this.snackBar.open('Erro ao ler PDF. Tente novamente.', 'Fechar', {
        duration: 4000,
      });
      this.fileName.set(null);
      this.resumeContent.set(null);
    } finally {
      this.isLoading.set(false);
      input.value = '';
    }
  }

  async removeResume(): Promise<void> {
    await this.storageService.remove('resume_content');
    await this.storageService.remove('resume_filename');

    this.fileName.set(null);
    this.resumeContent.set(null);

    this.snackBar.open('Currículo removido.', 'OK', {
      duration: 3000,
    });
  }

  async saveApiKey(): Promise<void> {
    const key = this.apiKeyInput().trim();
    if (!key) {
      this.snackBar.open('A API key não pode estar vazia.', 'OK', {
        duration: 3000,
      });
      return;
    }

    await this.storageService.set('gemini_api_key', key);
    this.apiKey.set(key);
    this.apiKeyInput.set('');
    this.isEditingApiKey.set(false);

    this.snackBar.open('API key salva com sucesso!', 'Fechar', {
      duration: 3000,
    });
  }

  async removeApiKey(): Promise<void> {
    await this.storageService.remove('gemini_api_key');
    this.apiKey.set(null);
    this.apiKeyInput.set('');
    this.isEditingApiKey.set(false);

    this.snackBar.open('API key removida.', 'OK', {
      duration: 3000,
    });
  }

  startEditApiKey(): void {
    this.apiKeyInput.set(this.apiKey() ?? '');
    this.isEditingApiKey.set(true);
  }

  cancelEditApiKey(): void {
    this.apiKeyInput.set('');
    this.isEditingApiKey.set(false);
  }
}
