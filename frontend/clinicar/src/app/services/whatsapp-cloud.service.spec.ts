import { TestBed } from '@angular/core/testing';

import { WhatsappCloudService } from './whatsapp-cloud.service';

describe('WhatsappCloudService', () => {
  let service: WhatsappCloudService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WhatsappCloudService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
