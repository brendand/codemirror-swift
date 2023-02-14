import * as CodeMirror from "codemirror";
import { javascript, javascriptLanguage, scopeCompletionSource } from "@codemirror/lang-javascript";
import {EditorState, Compartment} from "@codemirror/state";
import {EditorView} from "@codemirror/view";
import {basicSetup} from "codemirror";
import { indentWithTab } from "@codemirror/commands";
import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { css } from "@codemirror/lang-css";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { syntaxTree } from "@codemirror/language";


import {
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  keymap,
} from "@codemirror/view";

import {
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldKeymap,
} from "@codemirror/language";

import { history, defaultKeymap, historyKeymap } from "@codemirror/commands";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import {
  closeBrackets,
  autocompletion,
  closeBracketsKeymap,
  completionKeymap,
  snippetCompletion,
} from "@codemirror/autocomplete";

const theme = new Compartment();
const language = new Compartment();
const listener = new Compartment();
const readOnly = new Compartment();
const tabSize = new Compartment();
const fontSize = new Compartment();
const lineWrapping = new Compartment();
const SUPPORTED_LANGUAGES_MAP = {
  javascript,
  json,
  html,
  css,
  markdown,
  xml,
  txt: () => [],
};

var baseTheme = EditorView.baseTheme({
    "&light": {
    backgroundColor: "white",
        "color-scheme": "light",
    },
    "&dark": {
        "color-scheme": "dark",
    },
});

var completions = [
];

function customCompletions(context) {
    let before = context.matchBefore(/\w+/)
    // If completion wasn't explicitly started and there
    // is no word before the cursor, don't open completions.
    if (!context.explicit && !before) return null
        return {
            from: before ? before.from : context.pos,
        options: completions,
        validFor: /^\w*$/
        }
}

const myCustomCompletions = javascriptLanguage.data.of({
//autocomplete: scopeCompletionSource(globalThis)
    autocomplete: customCompletions
});

const editorView = new CodeMirror.EditorView({
  doc: "",
  extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      myCustomCompletions,
      autocompletion({
         activateOnTyping: true,
         closeOnBlur: false,
      }),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of([
          ...closeBracketsKeymap,
             ...defaultKeymap,
             ...searchKeymap,
             ...historyKeymap,
             ...foldKeymap,
             ...completionKeymap,
             indentWithTab,
      ]),
      readOnly.of([]),
      lineWrapping.of([]),
      fontSize.of([]),
      baseTheme,
      theme.of(oneDark),
      language.of(javascript()),
      listener.of([]),
  ],
  parent: document.body,
});

function getSupportedLanguages() {
  return Object.keys(SUPPORTED_LANGUAGES_MAP);
}

function setDarkMode(active) {
    editorView.dispatch({
    effects: theme.reconfigure(active ? [oneDark] : []),
    });
}

function setTabSize(view, size) {
    editorView.dispatch({
    effects: tabSize.reconfigure(EditorState.tabSize.of(size))
    })
}

function setFontSize(size) {

//    baseTheme = EditorView.baseTheme({
//        ".cm-content": {
//            fontSize : size + "pt",
//        },
//        ".cm-gutters": {
//            fontSize : size + "pt",
//        },
//    });
    
    editorView.dispatch({
            effects: fontSize.reconfigure(EditorView.editorAttributes.of({ style: "font-size : " + size + "pt;" }),)
//        effects: theme.reconfigure(baseTheme)
    });
}

function setLanguage(lang) {
  let langFn = SUPPORTED_LANGUAGES_MAP[lang];
  editorView.dispatch({
    effects: language.reconfigure(langFn ? langFn() : []),
  });
}

function setContent(text) {
    editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: text },
    });
}

function insertContent(text) {
    editorView.dispatch({
    changes: { from: editorView.state.selection.main.from, to: editorView.state.selection.main.to, insert: text },
    });
}

function formatJSONSelection() {

    let firstRange = editorView.state.selection.ranges.at(0);
    let selectedText = editorView.state.doc.toString().substring(firstRange.from,firstRange.to)
    var jsonPretty = JSON.stringify(JSON.parse(selectedText), null, 4);

    editorView.dispatch({
    changes: { from: editorView.state.selection.main.from, to: editorView.state.selection.main.to, insert: jsonPretty },
    });
}

function setListener(fn) {
  editorView.dispatch({
    effects: listener.reconfigure(
      EditorView.updateListener.of((v) => {
        if (v.docChanged) {
          fn(v.state.doc.toString());
        }
      })
    ),
  });
}

function setReadOnly(value) {
  editorView.dispatch({
    effects: readOnly.reconfigure(value ? EditorState.readOnly.of(true) : []),
  });
}


function setLineWrapping(enabled) {
  editorView.dispatch({
    effects: lineWrapping.reconfigure(enabled ? EditorView.lineWrapping : []),
  });
}

function setCompletions(comps, snippets) {
    completions = comps;
    
    if (snippets != undefined) {
        for (var snippet of snippets) {
            for (var key in snippet) {
                let completion = snippetCompletion(key, snippet[key]);
                completions.push(completion);
            }
        }
    }
    
    customCompletions(completions)
}


export {
  setDarkMode,
  setFontSize,
  setLanguage,
  getSupportedLanguages,
  setContent,
  insertContent,
  setListener,
  setReadOnly,
  setLineWrapping,
  setCompletions,
  editorView,
};
