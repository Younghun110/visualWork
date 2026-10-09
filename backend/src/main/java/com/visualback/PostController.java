package com.visualback;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PostController {
    private final PostService service;

    public PostController(PostService service) { this.service = service; }

    @GetMapping("/api/posts")
    public ApiResponse<List<Map<String, Object>>> list() {
        return ApiResponse.ok("조회 성공", service.list());
    }

    @GetMapping("/api/posts/grid")
    public ApiResponse<Map<String, Object>> grid() {
        return ApiResponse.ok("조회 성공", service.grid());
    }

    @GetMapping("/api/posts/{id}")
    public ApiResponse<Map<String, Object>> get(@PathVariable long id) {
        return ApiResponse.ok("조회 성공", service.get(id));
    }

    @PostMapping("/api/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Long>> create(@Valid @RequestBody PostRequest request) {
        return ApiResponse.ok("등록 성공", Map.of("id", service.create(request)));
    }

    @PutMapping("/api/posts/{id}")
    public ApiResponse<Map<String, Object>> update(@PathVariable long id,
            @Valid @RequestBody PostRequest request) {
        return ApiResponse.ok("수정 성공", service.update(id, request));
    }

    @DeleteMapping("/api/posts/{id}")
    public ApiResponse<Map<String, Long>> delete(@PathVariable long id) {
        service.delete(id);
        return ApiResponse.ok("삭제 성공", Map.of("id", id));
    }
}
