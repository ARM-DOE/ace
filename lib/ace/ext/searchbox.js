/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {
"use strict";

var dom = require("../lib/dom");
var lang = require("../lib/lang");
var event = require("../lib/event");
var searchboxCss = require("../requirejs/text!./searchbox.css");
var HashHandler = require("../keyboard/hash_handler").HashHandler;
var keyUtil = require("../lib/keys");

dom.importCssString(searchboxCss, "ace_searchbox");

var SearchBox = function(editor, range, showReplaceForm) {
    var div = dom.createElement("div");
    var self = this;

    //ace builds would fail if searchboxForm.html was in sam dir as searchbox.js
    //so look for it in PCM's repo, currently at pcm\client\dod\searchboxForm.html
     $(div).load( "searchboxForm.html", function( response, status, xhr ) {
        if ( status == "error" ) {
            var msg = "Sorry but there was an error: ";
            $( "#error" ).html( msg + xhr.status + " " + xhr.statusText );
        }else{
            self.element = div.firstChild;
            self.$init();
            self.setEditor(editor);

            if (editor.session.getTextRange()){
                self.searchInput.value = editor.session.getTextRange();
            }
        }
    });
};

(function() {
    this.setEditor = function(editor) {
        editor.searchBox = this;
        editor.container.appendChild(this.element);
        this.editor = editor;
    };

    this.$initElements = function(sb) {
        this.regExpOption = sb.querySelector(".checkbox_regex");
        this.caseSensitiveOption = sb.querySelector(".checkbox_caseSensative");
        this.wholeWordOption = sb.querySelector(".checkbox_wholeWord");
        this.searchInput = sb.querySelector(".whatInput");
        this.replaceInput = sb.querySelector(".replaceInput");
        this.noMatchText = sb.querySelector(".noMatch");
        this.findNextBtn = sb.querySelector(".findNext");
        this.replaceBtn = sb.querySelector(".replace");
        this.replaceNextBtn = sb.querySelector(".replaceNext");
        this.replaceAllBtn = sb.querySelector(".replaceAll");
        this.closeBtn = sb.querySelector(".closeSearchForm");
    };
    
    this.$init = function() {
        var sb = this.element;
        
        this.$initElements(sb);
        
        var _this = this;

        this.findNextBtn.onclick = function(){
            _this.findNext();
        }
        this.replaceBtn.onclick = function(){
            _this.replace();
        }
        this.replaceNextBtn.onclick = function (){
            _this.replaceAndFindNext();
        }
        this.replaceAllBtn.onclick = function(){
            _this.replaceAll();
        }
        this.closeBtn.onclick = function(){
            _this.hide();
        }

        event.addCommandKeyListener(sb, function(e, hashId, keyCode) {
            var keyString = keyUtil.keyCodeToString(keyCode);
            var command = _this.$searchBarKb.findKeyCommand(hashId, keyString);
            if (command && command.exec) {
                command.exec(_this);
                event.stopEvent(e);
            }
        });
    };

    //keybinging outsite of the searchbox
    this.$closeSearchBarKb = new HashHandler([{
        bindKey: "Esc",
        name: "closeSearchBar",
        exec: function(editor) {
            editor.searchBox.hide();
        }
    }]);

    //keybinging outsite of the searchbox
    this.$searchBarKb = new HashHandler();
    this.$searchBarKb.bindKeys({
        "Ctrl-f|Command-f": function(sb) {
            sb.searchInput.focus();
        },
        "Ctrl-H|Command-Option-F": function(sb) {
            sb.replaceInput.focus();
        },
        "Ctrl-G|Command-G": function(sb) {
            sb.findNext();
        },
        "Ctrl-Shift-G|Command-Shift-G": function(sb) {
            sb.findPrev();
        },
        "esc": function(sb) {
            setTimeout(function() { sb.hide();});
        },
        "Return": function(sb) {
            if (sb.activeInput == sb.replaceInput)
                sb.replace();
            sb.findNext();
        },
        "Shift-Return": function(sb) {
            if (sb.activeInput == sb.replaceInput)
                sb.replace();
            sb.findPrev();
        },
        "Alt-Return": function(sb) {
            if (sb.activeInput == sb.replaceInput)
                sb.replaceAll();
            sb.findAll();
        },
        "Tab": function(sb) {
            (sb.activeInput == sb.replaceInput ? sb.searchInput : sb.replaceInput).focus();
        }
    });

    this.$searchBarKb.addCommands([{
        name: "toggleRegexpMode",
        bindKey: {win: "Alt-R|Alt-/", mac: "Ctrl-Alt-R|Ctrl-Alt-/"},
        exec: function(sb) {
            sb.regExpOption.checked = !sb.regExpOption.checked;
            sb.$syncOptions();
        }
    }, {
        name: "toggleCaseSensitive",
        bindKey: {win: "Alt-C|Alt-I", mac: "Ctrl-Alt-R|Ctrl-Alt-I"},
        exec: function(sb) {
            sb.caseSensitiveOption.checked = !sb.caseSensitiveOption.checked;
            sb.$syncOptions();
        }
    }, {
        name: "toggleWholeWords",
        bindKey: {win: "Alt-B|Alt-W", mac: "Ctrl-Alt-B|Ctrl-Alt-W"},
        exec: function(sb) {
            sb.wholeWordOption.checked = !sb.wholeWordOption.checked;
            sb.$syncOptions();
        }
    }]);

    this.$syncOptions = function() {
        dom.setCssClass(this.regExpOption, "checked", this.regExpOption.checked);
        dom.setCssClass(this.wholeWordOption, "checked", this.wholeWordOption.checked);
        dom.setCssClass(this.caseSensitiveOption, "checked", this.caseSensitiveOption.checked);
        this.find(false, false);
    };

    this.highlight = function(re) {
        this.editor.session.highlight(re || this.editor.$search.$options.re);
        this.editor.renderer.updateBackMarkers()
    };
    this.find = function(skipCurrent, backwards, preventScroll) {
        var range = this.editor.find(this.searchInput.value, {
            skipCurrent: skipCurrent,
            backwards: backwards,
            wrap: true,
            regExp: this.regExpOption.checked,
            caseSensitive: this.caseSensitiveOption.checked,
            wholeWord: this.wholeWordOption.checked,
            preventScroll: preventScroll
        });
        var noMatch = !range && this.searchInput.value;
        //noMatch can either be false OR will be whatever was typed into search field...grrr
        if(noMatch == false){
            this.noMatchText.style.display = "none";
        }else{
            this.noMatchText.style.display = "";
        }
        this.editor._emit("findSearchBox", { match: !noMatch });
        this.highlight();
    };
    this.findNext = function() {
        this.find(true, false);
    };
    this.findPrev = function() {
        this.find(true, true);
    };
    this.findAll = function(){
        var range = this.editor.findAll(this.searchInput.value, {            
            regExp: this.regExpOption.checked,
            caseSensitive: this.caseSensitiveOption.checked,
            wholeWord: this.wholeWordOption.checked
        });
        var noMatch = !range && this.searchInput.value;
        //noMatch can either be false OR will be whatever was typed into search field...grrr
        if(noMatch == false){
            this.noMatchText.style.display = "none";
        }else{
            this.noMatchText.style.display = "";
        }
        this.editor._emit("findSearchBox", { match: !noMatch });
        this.highlight();
    };
    this.replace = function() {
        if (!this.editor.getReadOnly())
            this.editor.replace(this.replaceInput.value);
    };    
    this.replaceAndFindNext = function() {
        if (!this.editor.getReadOnly()) {
            this.editor.replace(this.replaceInput.value);
            this.findNext()
        }
    };
    this.replaceAll = function() {
        if (!this.editor.getReadOnly())
            this.editor.replaceAll(this.replaceInput.value);
    };

    this.hide = function() {
        this.element.style.display = "none";
        this.editor.keyBinding.removeKeyboardHandler(this.$closeSearchBarKb);
        this.editor.focus();
    };
    this.show = function(value) {
        this.element.style.display = "";

        if (value)
            this.searchInput.value = value;
        
        this.find(false, false, true);
        
        this.searchInput.focus();
        this.searchInput.select();

        this.editor.keyBinding.addKeyboardHandler(this.$closeSearchBarKb);
    };

    this.isFocused = function() {
        var el = document.activeElement;
        return el == this.searchInput || el == this.replaceInput;
    }
}).call(SearchBox.prototype);

exports.SearchBox = SearchBox;

exports.Search = function(editor, isReplace) {
     var sb;
    if(editor.searchBox){
        sb = editor.searchBox;
        sb.show(editor.session.getTextRange());
    }else{
        sb = new SearchBox(editor);
    }
};

});


/* ------------------------------------------------------------------------------------------
 * TODO
 * --------------------------------------------------------------------------------------- */
/*
- move search form to the left if it masks current word
- includ all options that search has. ex: regex
- searchbox.searchbox is not that pretty. we should have just searchbox
- disable prev button if it makes sence
*/
