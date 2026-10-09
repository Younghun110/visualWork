package com.visualback;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.dao.*;
import org.springframework.web.server.ResponseStatusException;
@RestControllerAdvice
public class ApiErrors {
  @ExceptionHandler(ResponseStatusException.class) ResponseEntity<?> status(ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getReason() == null ? "Request failed" : e.getReason())); }
  @ExceptionHandler({MethodArgumentNotValidException.class,HttpMessageNotReadableException.class}) ResponseEntity<?> invalid(Exception e) { return ResponseEntity.badRequest().body(Map.of("error", "Invalid request")); }
  @ExceptionHandler(DuplicateKeyException.class) ResponseEntity<?> duplicate(Exception e) { return ResponseEntity.status(409).body(Map.of("error", "Duplicate field value")); }
  @ExceptionHandler(DataAccessException.class) ResponseEntity<?> database(Exception e) { return ResponseEntity.status(500).body(Map.of("error", "Database operation failed")); }
}
