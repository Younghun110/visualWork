package com.visualback;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ApiErrorController implements ErrorController {
    @RequestMapping("/error")
    public ResponseEntity<ApiResponse<Void>> error(HttpServletRequest request) {
        Object value = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        int status = value instanceof Integer code ? code : 500;
        String message = status == 404 ? "요청 경로를 찾을 수 없습니다." : "요청을 처리하지 못했습니다.";
        return ResponseEntity.status(status).body(ApiResponse.failure(message));
    }
}
