package com.visualback;

import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception exception, Object body,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        String message = status.is5xxServerError() ? "서버 요청에 실패했습니다." : "요청 형식이 올바르지 않습니다.";
        if (exception instanceof MethodArgumentNotValidException invalid) {
            var field = invalid.getBindingResult().getFieldError();
            if (field != null && field.getDefaultMessage() != null) message = field.getDefaultMessage();
        }
        return new ResponseEntity<>(ApiResponse.failure(message), headers, status);
    }
    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<ApiResponse<Void>> duplicate() {
        return ResponseEntity.status(409).body(ApiResponse.failure("이미 등록된 값입니다. 중복 불가 항목을 확인하세요."));
    }
    @ExceptionHandler({DataAccessException.class, IllegalStateException.class})
    public ResponseEntity<ApiResponse<Void>> database() {
        return ResponseEntity.status(500).body(ApiResponse.failure("DB 요청에 실패했습니다."));
    }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> unexpected() {
        return ResponseEntity.status(500).body(ApiResponse.failure("서버 요청에 실패했습니다."));
    }
}
