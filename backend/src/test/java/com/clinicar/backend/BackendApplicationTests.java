package com.clinicar.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import com.clinicar.backend.service.WhatsAppService;

@SpringBootTest
class BackendApplicationTests {

	@MockBean
	private WhatsAppService whatsAppService;

	@Test
	void contextLoads() {
	}

}
