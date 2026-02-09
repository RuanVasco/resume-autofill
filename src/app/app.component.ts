import { Component, inject, OnInit } from '@angular/core';
import { PdfService } from './services/pdf/pdf.service';
import { StorageService } from './services/storage/storage.service';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-root',
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private pdfService = inject(PdfService);
  private storageService = inject(StorageService);

  isLoading = false;
  fileName: string | null = null;
  storedTextPreview: string | null = null;

  async ngOnInit(): Promise<Promise<void>> {
    const savedName = await this.storageService.get<string>('resume_filename');
    if (savedName) {
      this.fileName = savedName;
      const fullText = await this.storageService.get<string>('resume_content');
      this.storedTextPreview = fullText
        ? fullText.substring(0, 100) + '...'
        : null;
    }
  }

  async onFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      if (file.type !== 'application/pdf') {
        // this.snackBar.open('Por favor, selecione apenas arquivos PDF.', 'OK', {
        //   duration: 3000,
        // });
        return;
      }

      this.isLoading = true;
      this.fileName = file.name;

      try {
        console.log('Iniciando extração...');
        const text = await this.pdfService.extractText(file);

        await this.storageService.set('resume_content', text);
        await this.storageService.set('resume_filename', file.name);

        this.storedTextPreview = text.substring(0, 100) + '...';

        // this.snackBar.open(
        //   'Currículo processado e salvo com sucesso!',
        //   'Fechar',
        //   {
        //     duration: 3000,
        //     panelClass: ['success-snackbar'],
        //   },
        // );
      } catch (error) {
        console.error('Erro ao processar:', error);
        // this.snackBar.open('Erro ao ler PDF. Verifique o console.', 'Fechar');
        this.fileName = null;
      } finally {
        this.isLoading = false;
      }
    }
  }

  title = 'resume-autofill';
}
