package com.droidtranslator.app.model;

public class PromptCardItem {
    public long id;
    public String title;
    public String content;
    public boolean active;

    public PromptCardItem(long id, String title, String content, boolean active) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.active = active;
    }
}
