import Foundation
import WebKit

#if canImport(AppKit)
    import AppKit
    public typealias NativeView = NSView
#elseif canImport(UIKit) && !os(watchOS)
    import UIKit
    public typealias NativeView = UIView
#endif

public protocol CodeMirrorWebViewDelegate: AnyObject {
    func codeMirrorViewDidLoadSuccess(_ sender: CodeMirrorWebView)
    func codeMirrorViewDidLoadError(_ sender: CodeMirrorWebView, error: Error)
    func codeMirrorViewDidChangeContent(_ sender: CodeMirrorWebView, content: String)
}

public final class CodeMirrorWebView: NativeView {
    public weak var delegate: CodeMirrorWebViewDelegate?

    private lazy var webview: WKWebView = {
        let preferences = WKPreferences()
        var userController = WKUserContentController()
        userController.add(self, name: "codeMirrorDidReady")
        userController.add(self, name: "codeMirrorContentDidChange")

        let configuration = WKWebViewConfiguration()
        configuration.preferences = preferences
        configuration.userContentController = userController
        let webView = WKWebView(frame: bounds, configuration: configuration)
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground")  // prevent white flicks
        return webView
    }()

    private var pageLoaded = false
    private var pendingFunctions = [JavascriptFunction]()

    #if os(macOS)
    public override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        commonInit()
    }
    #else
    public override init(frame frameRect: CGRect) {
        super.init(frame: frameRect)
        commonInit()
    }
    #endif
    
    #if (macOS)
    override public func viewDidChangeEffectiveAppearance() {
        if self.effectiveAppearance.name == .aqua {
            self.setDarkMode(on: false)
        } else {
            self.setDarkMode(on: true)
        }
    }
    #endif

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        commonInit()
    }

    public func setContent(_ value: String) {
        queueJavascriptFunction(
            JavascriptFunction(
                functionString: "CodeMirror.setContent(value)",
                args: ["value": value]
            )
        )
    }

    public func insertContent(_ value: String) {
        queueJavascriptFunction(
            JavascriptFunction(
                functionString: "CodeMirror.insertContent(value)",
                args: ["value": value]
            )
        )
    }
    
    public func setDarkMode(on: Bool) {
        queueJavascriptFunction(
            JavascriptFunction(functionString: "CodeMirror.setDarkMode(on)", args: ["on": on])
        )
    }

    public func setFontSize(_ value: Int) {
        queueJavascriptFunction(
            JavascriptFunction(
                functionString: "CodeMirror.setFontSize(value)",
                args: ["value": value]
            )
        )
    }
    
    public func setTabChar(_ value: String) {
        queueJavascriptFunction(
            JavascriptFunction(
                functionString: "CodeMirror.setTabChar(value)",
                args: ["value": value]
            )
        )
    }
    
    public func setLanguage(_ lang: String) {
        queueJavascriptFunction(
            JavascriptFunction(functionString: "CodeMirror.setLanguage(\"\(lang)\")")
        )
    }

    public func getSupportedLanguages(_ callback: JavascriptCallback?) {
        queueJavascriptFunction(
            JavascriptFunction(
                functionString: "CodeMirror.getSupportedLanguages()",
                callback: callback
            )
        )
    }

    public func setReadonly(_ value: Bool) {
        queueJavascriptFunction(
            JavascriptFunction(
                functionString: "CodeMirror.setReadOnly(value)",
                args: ["value": value]
            )
        )
    }

    public func setLineWrapping(_ enabled: Bool) {
        queueJavascriptFunction(
            JavascriptFunction(
                functionString: "CodeMirror.setLineWrapping(enabled)",
                args: ["enabled": enabled]
            )
        )
    }

    public func setCompletions(_ completions: [[String: String]], snippets: [[String : Any]]?) {
        queueJavascriptFunction(
            JavascriptFunction(
                functionString: "CodeMirror.setCompletions(comps, snippets)",
                args: ["comps": completions, "snippets" : snippets ?? [[:]]]
            )
        )
    }
    
    private func commonInit() {
        #if os(macOS)
        webview.allowsMagnification = false
        #endif
        webview.translatesAutoresizingMaskIntoConstraints = false
        addSubview(webview)

        NSLayoutConstraint.activate([
            webview.leadingAnchor.constraint(equalTo: leadingAnchor),
            webview.trailingAnchor.constraint(equalTo: trailingAnchor),
            webview.topAnchor.constraint(equalTo: topAnchor),
            webview.bottomAnchor.constraint(equalTo: bottomAnchor),

        ])

        let indexURL = Bundle.module.url(
            forResource: "index",
            withExtension: "html",
            subdirectory: "build"
        )
        let baseURL = Bundle.module.url(forResource: "build", withExtension: nil)

        let data = try! Data.init(contentsOf: indexURL!)
        webview.load(data, mimeType: "text/html", characterEncodingName: "utf-8", baseURL: baseURL!)
    }

    private func queueJavascriptFunction(_ function: JavascriptFunction) {
        if pageLoaded {
            evaluateJavascript(function: function)
        }
        else {
            pendingFunctions.append(function)
        }
    }

    private func callPendingFunctions() {
        for function in pendingFunctions {
            evaluateJavascript(function: function)
        }
        pendingFunctions.removeAll()
    }

    private func evaluateJavascript(function: JavascriptFunction) {
        // not sure why but callAsyncJavaScript always callback with result of nil
        if let callback = function.callback {
            webview.evaluateJavaScript(function.functionString) { (response, error) in
                if let error = error {
                    callback(.failure(error))
                }
                else {
                    callback(.success(response))
                }
            }
        }
        else {
            webview.callAsyncJavaScript(
                function.functionString,
                arguments: function.args,
                in: nil,
                in: .page
            ) { (result) in
                switch result {
                case .failure(let error):
                    function.callback?(.failure(error))
                case .success(let data):
                    function.callback?(.success(data))
                }
            }
        }
    }
}

extension CodeMirrorWebView: WKScriptMessageHandler {
    public func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        switch message.name {
        case "codeMirrorDidReady":
            pageLoaded = true
            callPendingFunctions()
        case "codeMirrorContentDidChange":
            delegate?.codeMirrorViewDidChangeContent(self, content: message.body as? String ?? "")
        default:
            print("CodeMirrorWebView receive \(message.name) \(message.body)")
        }
    }
}

// MARK: WKNavigationDelegate

extension CodeMirrorWebView: WKNavigationDelegate {
    public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        delegate?.codeMirrorViewDidLoadSuccess(self)
    }

    public func webView(
        _ webView: WKWebView,
        didFail navigation: WKNavigation!,
        withError error: Error
    ) {
        delegate?.codeMirrorViewDidLoadError(self, error: error)
    }

    public func webView(
        _ webView: WKWebView,
        didFailProvisionalNavigation navigation: WKNavigation!,
        withError error: Error
    ) {
        delegate?.codeMirrorViewDidLoadError(self, error: error)
    }
}

public typealias JavascriptCallback = (Result<Any?, Error>) -> Void
private struct JavascriptFunction {

    let functionString: String
    let args: [String: Any]
    let callback: JavascriptCallback?

    init(functionString: String, args: [String: Any] = [:], callback: JavascriptCallback? = nil) {
        self.functionString = functionString
        self.args = args
        self.callback = callback
    }
}

extension Data {
    var prettyJson: String? {
        guard let object = try? JSONSerialization.jsonObject(with: self, options: []),
              let data = try? JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted]),
              let prettyPrintedString = String(data: data, encoding:.utf8) else { return nil }
        
        return prettyPrintedString
    }
}

