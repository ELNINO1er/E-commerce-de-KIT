import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from '../../../core/api/api.endpoints';
import { ApiService } from '../../../core/api/api.service';
import { MediaRepository, UploadedImage } from '../domain/ports/media-repository.port';

@Injectable()
export class HttpMediaRepository implements MediaRepository {
  private readonly api = inject(ApiService);

  uploadImage(file: File): Observable<UploadedImage> {
    const form = new FormData();
    // Le nom de la part est impose par l'API : `file`.
    form.append('file', file);
    // Aucun `Content-Type` n'est pose a la main : le navigateur doit generer
    // lui-meme le `multipart/form-data; boundary=…`.
    return this.api.post<UploadedImage>(API.admin.uploads.image, form);
  }
}
