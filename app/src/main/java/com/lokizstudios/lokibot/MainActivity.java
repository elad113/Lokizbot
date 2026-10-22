package com.lokizstudios.lokibot;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewAssetLoader.AssetsPathHandler;

public class MainActivity extends Activity {
    private WebView webView;
    private WebViewAssetLoader assetLoader;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(22, 18, 35));
        getWindow().setNavigationBarColor(Color.rgb(22, 18, 35));
        getWindow().getDecorView().setSystemUiVisibility(0);
        assetLoader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new AssetsPathHandler(this))
            .build();
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(22, 18, 35));
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setDatabaseEnabled(true);
        webView.getSettings().setAllowFileAccess(false);
        webView.getSettings().setAllowContentAccess(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, android.webkit.WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        setContentView(webView);
        webView.loadUrl("https://appassets.androidplatform.net/assets/site/index.html");
    }

    @Override protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        // Reload the bundled page on recreation instead of restoring a potentially blank WebView.
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
}
