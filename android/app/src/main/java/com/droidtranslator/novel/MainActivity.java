package com.droidtranslator.novel;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RootBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
