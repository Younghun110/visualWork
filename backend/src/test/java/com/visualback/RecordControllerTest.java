package com.visualback;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class RecordControllerTest {
    private RecordService service;
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        service = mock(RecordService.class);
        mvc = MockMvcBuilders.standaloneSetup(new RecordController(service))
                .setControllerAdvice(new ApiExceptionHandler()).build();
    }

    @Test
    void wrapsHealthAndUnsupportedMethods() throws Exception {
        mvc.perform(get("/health")).andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("조회 성공"))
                .andExpect(jsonPath("$.data.status").value("ok"));
        mvc.perform(delete("/api/records")).andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").value(org.hamcrest.Matchers.nullValue()));
    }

    @Test
    void listsJsonAndCreatesTrimmedRecord() throws Exception {
        when(service.list()).thenReturn(List.of(Map.of("id", 1L, "name", "Kim")));
        mvc.perform(get("/api/records")).andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true)).andExpect(jsonPath("$.message").value("조회 성공"))
                .andExpect(jsonPath("$.data[0].id").value(1));
        when(service.create(any())).thenReturn(2L);
        mvc.perform(post("/api/records").contentType("application/json")
                .content("{\"name\":\" Kim \",\"email\":\" kim@example.com \"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.id").value(2));
        verify(service).create(new RecordRequest("Kim", "kim@example.com"));
    }

    @Test
    void gridSeparatesHeadersAndRows() throws Exception {
        when(service.list()).thenReturn(List.of(Map.of("id", 1L, "name", "Kim", "email", "kim@example.com")));
        mvc.perform(get("/api/grid")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.columns[0].field").value("name"))
                .andExpect(jsonPath("$.data.columns[0].title").value("이름"))
                .andExpect(jsonPath("$.data.data[0].name").value("Kim"));
    }

    @Test
    void rejectsInvalidAndMalformedInput() throws Exception {
        for (String body : List.of("{}", "{", "{\"name\":\"Kim\",\"email\":\"bad\"}")) {
            mvc.perform(post("/api/records").contentType("application/json").content(body))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.success").value(false)).andExpect(jsonPath("$.data").value(org.hamcrest.Matchers.nullValue())).andExpect(jsonPath("$.message").isString());
        }
        verifyNoInteractions(service);
    }

    @Test
    void returnsConflictAndHidesDatabaseDetails() throws Exception {
        when(service.create(any())).thenThrow(new DuplicateKeyException("private SQL"));
        mvc.perform(post("/api/records").contentType("application/json")
                .content("{\"name\":\"Kim\",\"email\":\"kim@example.com\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").isString());
        when(service.list()).thenThrow(new DataAccessResourceFailureException("secret password"));
        mvc.perform(get("/api/records")).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("DB 요청에 실패했습니다."));
    }
}
