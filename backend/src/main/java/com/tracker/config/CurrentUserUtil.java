package com.tracker.config;

import com.tracker.entity.User;
import jakarta.servlet.http.HttpServletRequest;

public class CurrentUserUtil {

    public static User getUser(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) {
            throw new RuntimeException("No authenticated user found in request");
        }
        return user;
    }
}
