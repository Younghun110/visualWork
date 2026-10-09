package com.visualback;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RecordRequest(
        @NotBlank(message = "이름: 필수 항목입니다.")
        @Size(max = 255, message = "이름: 255자 이내로 입력하세요.") String name,
        @NotBlank(message = "이메일: 필수 항목입니다.")
        @Email(message = "이메일: 형식을 확인하세요.")
        @Size(max = 255, message = "이메일: 255자 이내로 입력하세요.") String email) {
    public RecordRequest {
        name = name == null ? null : name.trim();
        email = email == null ? null : email.trim();
    }
}
