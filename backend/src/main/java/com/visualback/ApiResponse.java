package com.visualback;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record ApiResponse<T>(boolean success, String message, T data,
        @JsonInclude(JsonInclude.Include.NON_NULL) Integer pageNo,
        @JsonInclude(JsonInclude.Include.NON_NULL) Long totalCount) {
    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data, null, null);
    }
    public static <T> ApiResponse<T> page(String message, T data, int pageNo, long totalCount) {
        return new ApiResponse<>(true, message, data, pageNo, totalCount);
    }
    public static ApiResponse<Void> failure(String message) {
        return new ApiResponse<>(false, message, null, null, null);
    }
}
