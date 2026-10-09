package com.visualback;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.containsString;

@SpringBootTest
@AutoConfigureMockMvc
class ApiDocsTest {
    @Autowired MockMvc mvc;
    @Test void servesSwaggerAndLocalRapiDocWithOpenApi() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
                .andExpect(jsonPath("$.openapi").exists())
                .andExpect(jsonPath("$.paths['/api/records'].get").exists())
                .andExpect(jsonPath("$.paths['/api/grid'].get").exists());
        mvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk())
                .andExpect(content().string(containsString("swagger-ui")));
        mvc.perform(get("/rapidoc.html")).andExpect(status().isOk())
                .andExpect(content().string(containsString("spec-url=\"/v3/api-docs\"")))
                .andExpect(content().string(containsString("/docs/rapidoc-min.js")));
        mvc.perform(get("/docs/rapidoc-min.js")).andExpect(status().isOk());
    }
}
