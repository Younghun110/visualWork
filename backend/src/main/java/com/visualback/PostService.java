package com.visualback;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;

@Service
public class PostService {
    private final JdbcTemplate jdbc;

    public PostService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> list() {
        return jdbc.queryForList("SELECT id, title, content, author, created_at, updated_at FROM posts ORDER BY id DESC LIMIT 100");
    }

    public Map<String, Object> grid() {
        return Map.of("columns", List.of(
                Map.of("field", "title", "title", "제목"),
                Map.of("field", "content", "title", "내용"),
                Map.of("field", "author", "title", "작성자"),
                Map.of("field", "created_at", "title", "작성일"),
                Map.of("field", "updated_at", "title", "수정일")), "data", list());
    }

    public Map<String, Object> get(long id) {
        return jdbc.queryForMap("SELECT id, title, content, author, created_at, updated_at FROM posts WHERE id = ?", id);
    }

    public long create(PostRequest request) {
        var key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO posts (title, content, author) VALUES (?, ?, ?)", Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, request.title());
            statement.setString(2, request.content());
            statement.setString(3, request.author());
            return statement;
        }, key);
        Number id = key.getKey();
        if (id == null) throw new IllegalStateException("Missing generated post ID");
        return id.longValue();
    }

    public Map<String, Object> update(long id, PostRequest request) {
        jdbc.update("UPDATE posts SET title = ?, content = ?, author = ? WHERE id = ?",
                request.title(), request.content(), request.author(), id);
        return get(id);
    }

    public void delete(long id) {
        if (jdbc.update("DELETE FROM posts WHERE id = ?", id) == 0)
            throw new EmptyResultDataAccessException("Post not found", 1);
    }
}
