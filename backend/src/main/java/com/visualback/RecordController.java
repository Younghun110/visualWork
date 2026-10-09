package com.visualback;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
public class RecordController {
    private final RecordService service;
    public RecordController(RecordService service) { this.service = service; }

    @GetMapping("/health")
    public ApiResponse<Map<String, String>> health() { return ApiResponse.ok("조회 성공", Map.of("status", "ok")); }

    @GetMapping("/api/records")
    public ApiResponse<List<Map<String, Object>>> list() { return ApiResponse.ok("조회 성공", service.list()); }

    @GetMapping("/api/grid")
    public ApiResponse<Map<String, Object>> grid() {
        return ApiResponse.ok("조회 성공", Map.of("columns", List.of(
                Map.of("field", "name", "title", "이름"),
                Map.of("field", "email", "title", "이메일")), "data", service.list()));
    }

    @PostMapping("/api/records")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Long>> create(@Valid @RequestBody RecordRequest request) {
        return ApiResponse.ok("등록 성공", Map.of("id", service.create(request)));
    }

    @GetMapping("/api/records/{id}")
    public ApiResponse<Map<String, Object>> get(@PathVariable long id) {
        return ApiResponse.ok("조회 성공", service.get(id));
    }

    @PutMapping("/api/records/{id}")
    public ApiResponse<Map<String, Object>> update(@PathVariable long id,
            @Valid @RequestBody RecordRequest request) {
        return ApiResponse.ok("수정 성공", service.update(id, request));
    }

    @DeleteMapping("/api/records/{id}")
    public ApiResponse<Map<String, Long>> delete(@PathVariable long id) {
        service.delete(id);
        return ApiResponse.ok("삭제 성공", Map.of("id", id));
    }
}
