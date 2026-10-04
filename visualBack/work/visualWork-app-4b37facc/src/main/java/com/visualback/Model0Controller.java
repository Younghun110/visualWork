package com.visualback;
import java.util.*;
import java.sql.Statement;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@RestController
@RequestMapping("/api/members")
public class Model0Controller {
  private final JdbcTemplate jdbc;
  public Model0Controller(JdbcTemplate jdbc) { this.jdbc = jdbc; }
  public record Request(@jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Size(max=255) @jakarta.validation.constraints.NotBlank String name, @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Size(max=255) @jakarta.validation.constraints.NotBlank String email) {}
  @GetMapping public List<Map<String,Object>> list(@RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int size) {
    if (page < 1 || size < 1 || size > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid pagination");
    return jdbc.queryForList("SELECT * FROM `members` ORDER BY id DESC LIMIT ? OFFSET ?", size, ((long)page - 1) * size);
  }
  @GetMapping("/grid") public Map<String,Object> grid(@RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int size) {
    return Map.of("columns", List.of(Map.of("field", "name", "title", "이름"), Map.of("field", "email", "title", "이메일")), "data", list(page,size));
  }
  @GetMapping("/{id}") public Map<String,Object> detail(@PathVariable long id) {
    var rows = jdbc.queryForList("SELECT * FROM `members` WHERE id = ?", id);
    if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found");
    return rows.getFirst();
  }
  @PostMapping @ResponseStatus(HttpStatus.CREATED) public Map<String,Object> create(@jakarta.validation.Valid @RequestBody Request request) {
    var key = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var statement = connection.prepareStatement("INSERT INTO `members` (`name`, `email`) VALUES (?, ?)", Statement.RETURN_GENERATED_KEYS);
      Object[] values = {request.name(), request.email()};
      for (int i = 0; i < values.length; i++) statement.setObject(i + 1, values[i]);
      return statement;
    }, key);
    return Map.of("id", Objects.requireNonNull(key.getKey()).longValue());
  }
  @PutMapping("/{id}") public Map<String,Object> update(@PathVariable long id, @jakarta.validation.Valid @RequestBody Request request) {
    detail(id);
    jdbc.update("UPDATE `members` SET `name` = ?, `email` = ? WHERE id = ?", request.name(), request.email(), id);
    return detail(id);
  }
  @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable long id) {
    if (jdbc.update("DELETE FROM `members` WHERE id = ?", id) == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found");
  }
}
