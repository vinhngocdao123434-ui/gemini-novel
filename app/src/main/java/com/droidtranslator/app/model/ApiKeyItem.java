package com.droidtranslator.app.model;

public class ApiKeyItem {
    public String key;
    public String state; // ACTIVE, COOLDOWN, INVALID, ERROR
    public long cooldownUntil;
    public int totalRequests;
    public int successRequests;

    public ApiKeyItem(String key) {
        this.key = key;
        this.state = "ACTIVE";
        this.cooldownUntil = 0;
        this.totalRequests = 0;
        this.successRequests = 0;
    }
}
