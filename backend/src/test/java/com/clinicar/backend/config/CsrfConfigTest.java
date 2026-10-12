package com.clinicar.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import jakarta.servlet.http.Cookie;
import static org.junit.jupiter.api.Assertions.*;

class CsrfConfigTest {
    @Test void bloqueiaPostSemTokenEPermiteCookieComCabecalhoCorrespondente() throws Exception {
        var filter = new CsrfConfig().csrfFilter(false).getFilter();
        var request = new MockHttpServletRequest("POST", "/api/peca");
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain(); filter.doFilter(request, response, chain);
        assertEquals(403, response.getStatus()); assertNull(chain.getRequest());

        var get = new MockHttpServletRequest("GET", "/api/auth/csrf");
        var firstResponse = new MockHttpServletResponse(); filter.doFilter(get, firstResponse, new MockFilterChain());
        Cookie cookie = firstResponse.getCookie("XSRF-TOKEN"); assertNotNull(cookie);
        var post = new MockHttpServletRequest("POST", "/api/peca");
        post.setCookies(cookie); post.addHeader("X-XSRF-TOKEN", cookie.getValue());
        var accepted = new MockFilterChain(); var acceptedResponse = new MockHttpServletResponse();
        filter.doFilter(post, acceptedResponse, accepted); assertNotNull(accepted.getRequest());
        assertEquals(200, acceptedResponse.getStatus());
    }
    @Test void rejeitaTokenDiferenteDoCookie() throws Exception {
        var post = new MockHttpServletRequest("DELETE", "/api/peca/1");
        post.setCookies(new Cookie("XSRF-TOKEN", "correto")); post.addHeader("X-XSRF-TOKEN", "incorreto");
        var response = new MockHttpServletResponse();
        new CsrfConfig().csrfFilter(false).getFilter().doFilter(post, response, new MockFilterChain());
        assertEquals(403, response.getStatus());
    }
}
