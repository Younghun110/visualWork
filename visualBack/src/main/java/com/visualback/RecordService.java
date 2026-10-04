package com.visualback;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;

@Service
public class RecordService {
    private final JdbcTemplate jdbc;

    public RecordService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> list() {
        return jdbc.queryForList("SELECT id, name, email, created_at FROM members ORDER BY id DESC LIMIT 100");
    }

    public long create(RecordRequest request) {
        var key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO members (name, email) VALUES (?, ?)", Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, request.name());
            statement.setString(2, request.email());
            return statement;
        }, key);
        Number id = key.getKey();
        if (id == null) throw new IllegalStateException("Missing generated record ID");
        return id.longValue();
    }
}
