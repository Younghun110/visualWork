package com.visualback;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
class Model0ControllerTest {
  static class MemoryJdbc extends JdbcTemplate {
    Object[] lastArguments;
    @Override public List<Map<String,Object>> queryForList(String sql, Object... args) {
      lastArguments=args;
      if (sql.contains("WHERE") && ((Number)args[0]).longValue()==999) return List.of();
      return List.of(Map.of("id",1L));
    }
    @Override public int update(String sql,Object... args) { lastArguments=args; return ((Number)args[args.length-1]).longValue()==999?0:1; }
    @Override public int update(PreparedStatementCreator creator,KeyHolder holder) { holder.getKeyList().add(Map.of("id",7L)); return 1; }
  }
  @Test void jsonApiAndPagination() throws Exception {
    var jdbc=new MemoryJdbc();
    var mvc=MockMvcBuilders.standaloneSetup(new Model0Controller(jdbc)).setControllerAdvice(new ApiErrors()).build();
    mvc.perform(get("/api/members?page=2&size=10")).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(1));
    assertArrayEquals(new Object[]{10,10L},jdbc.lastArguments);
    mvc.perform(get("/api/members/grid")).andExpect(status().isOk()).andExpect(jsonPath("$.columns[0].field").value("name")).andExpect(jsonPath("$.data[0].id").value(1));
    mvc.perform(get("/api/members?size=101")).andExpect(status().isBadRequest());
    mvc.perform(get("/api/members/999")).andExpect(status().isNotFound());
    mvc.perform(post("/api/members").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Example\",\"email\":\"Example\"}")).andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(7));
    mvc.perform(put("/api/members/1").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Example\",\"email\":\"Example\"}")).andExpect(status().isOk());
    mvc.perform(delete("/api/members/1")).andExpect(status().isNoContent());
    mvc.perform(delete("/api/members/999")).andExpect(status().isNotFound());
    mvc.perform(post("/api/members").contentType(MediaType.APPLICATION_JSON).content("invalid")).andExpect(status().isBadRequest());
  }
}
