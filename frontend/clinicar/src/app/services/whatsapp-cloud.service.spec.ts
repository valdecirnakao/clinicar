import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { WhatsappCloudService } from './whatsapp-cloud.service';

describe('WhatsappCloudService', () => {
  let service: WhatsappCloudService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],});
    service = TestBed.inject(WhatsappCloudService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
