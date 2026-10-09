package com.visualback;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostRequest(
        @NotBlank(message = "제목: 필수 항목입니다.")
        @Size(max = 255, message = "제목: 255자 이내로 입력하세요.") String title,
        @NotBlank(message = "내용: 필수 항목입니다.") String content,
        @NotBlank(message = "작성자: 필수 항목입니다.")
        @Size(max = 100, message = "작성자: 100자 이내로 입력하세요.") String author) {
    public PostRequest {
        title = title == null ? null : title.trim();
        content = content == null ? null : content.trim();
        author = author == null ? null : author.trim();
    }
}
