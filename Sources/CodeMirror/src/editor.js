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
import { bbedit } from "@codemirror/theme-bbedit";
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
  indentUnit,
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
const indentCharacter = new Compartment();
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
    //    ".cm-content": {minHeight: "638px"},
    //    "cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {backgroundColor: "#BAD6FB"},
    //    ".cm-selectionMatch .cm-snippetField": {backgroundColor: "#BAD6FB"},
    //    "&.cm-focused .cm-cursor": {borderLeftColor: "#BAD6FB"},
    ////    ".cm-gutters": {backgroundColor: "#eaeaea", border: "1", color: "#4C566A"},
    //    "&dark.cm-activeLineGutter": {backgroundColor: "#6CB0F4", color: "#ECEFF4"},
    //    "&dark.cm-activeLine": {backgroundColor: "#6CB0F4", border: "none", color: "#000"},
    ////    ".cm-tooltip": {border: "none", backgroundColor: "#4C566A"},
    ////    ".cm-tooltip .cm-tooltip-arrow:before": {borderTopColor: "transparent", borderBottomColor: "transparent"},
    ////    ".cm-tooltip .cm-tooltip-arrow:after": {borderTopColor: '#B48EAD', borderBottomColor: '#B48EAD'},
    ////    ".cm-tooltip-autocomplete": {"& > ul > li[aria-selected]": {backgroundColor: '#4C566A', color: '#ffffff'}}
    //}, {dark: false});
});
    
//let myTheme = EditorView.theme({
//    "&": {
//    color: "black",
//    backgroundColor: "#fff"
//    },
//    ".cm-content": {
//    caretColor: "#0e9"
//    },
//    "&.cm-focused .cm-cursor": {
//    borderLeftColor: "#0e9"
//    },
//    "&.cm-focused .cm-selectionBackground, ::selection": {
//    backgroundColor: "#074"
//    },
//    ".cm-gutters": {
//    backgroundColor: "#eee",
//    color: "#000",
//    border: "none"
//    }
//}, {dark: false})

var completions = [
];

function customCompletions(context) {
    const word = context.matchBefore(/\w*/);
    
    if (word.from == word.to && !context.explicit) return null;
    
    // Check if the cursor is inside a text token
    const nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);
    if (nodeBefore?.type.name === 'TextToken') {
        return null;
    }
    
    return {
        from: word.from,
    options: completions,
    };
}

const myCustomCompletions = javascriptLanguage.data.of({
    autocomplete: customCompletions
});

const scopeCompletions = javascriptLanguage.data.of({
autocomplete: scopeCompletionSource(window)
})

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
      scopeCompletions,
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
      indentUnit.of("    "),
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

function setIndentCharacter(value) {
    editorView.dispatch({
    effects: indentCharacter.reconfigure(EditorState.indentUnit.of([value]))
//     	effects: indentCharacter.reconfigure(value ? EditorView.indentUnit.of(value) : "[]"),
    })
}

function setFontSize(size) {

//    let currentTheme = EditorView.theme({
//        ".cm-content": {
//            fontSize : size + "pt",
//        },
//        ".cm-gutters": {
//            fontSize : size + "pt",
//        },
//    });
//
//    insertContent(JSON.stringify(currentTheme));

    
    editorView.dispatch({
        effects: fontSize.reconfigure(EditorView.editorAttributes.of({ style: "font-size : " + size + "pt;" }),)
//        effects: theme.reconfigure(currentTheme)
    });
}

function goToLine(line) {
    // Get line info from current state.
                      
    const lineContent = editorView.state.doc.line(line);
    
    editorView.dispatch({
        // Set selection to that entire line.
    selection: { anchor: lineContent.from },
        // Ensure the selection is shown in viewport
    scrollIntoView: true
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


const timer = setInterval(() => {
    editorView.focus();
    if(editorView.hasFocus) clearInterval(timer);
}, 500);

export {
  setDarkMode,
  setFontSize,
  setIndentCharacter,
  setLanguage,
  getSupportedLanguages,
  setContent,
  insertContent,
  setListener,
  setReadOnly,
  goToLine,
  setLineWrapping,
  setCompletions,
  editorView,
};
