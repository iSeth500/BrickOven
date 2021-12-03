/* eslint-disable max-lines */
require('./codeEditor.less');
const React = require('react');
const createClass = require('create-react-class');
const _ = require('lodash');
const cx = require('classnames');


let CodeMirror;
if(typeof navigator !== 'undefined'){
	CodeMirror = require('codemirror');

	//Language Modes
	require('codemirror/mode/gfm/gfm.js'); //Github flavoured markdown
	require('codemirror/mode/css/css.js');
	require('codemirror/mode/javascript/javascript.js');

	//Addons
	require('codemirror/addon/fold/foldcode.js');
	require('codemirror/addon/fold/foldgutter.js');

	const foldCode = require('./fold-code');
	foldCode.registerHomebreweryHelper(CodeMirror);
}

const CodeEditor = createClass({
	getDefaultProps : function() {
		return {
			language : '',
			value    : '',
			wrap     : true,
			onChange : ()=>{}
		};
	},

	getInitialState : function() {
		return {
			docs : {}
		};
	},

	componentDidMount : function() {
		this.buildEditor();
		const newDoc = CodeMirror.Doc(this.props.value, this.props.language);
		this.codeMirror.swapDoc(newDoc);
	},

	componentDidUpdate : function(prevProps) {
		if(prevProps.view !== this.props.view){ //view changed; swap documents
			let newDoc;

			if(!this.state.docs[this.props.view]) {
				newDoc = CodeMirror.Doc(this.props.value, this.props.language);
			} else {
				newDoc = this.state.docs[this.props.view];
			}

			const oldDoc = { [prevProps.view]: this.codeMirror.swapDoc(newDoc) };

			this.setState((prevState)=>({
				docs : _.merge({}, prevState.docs, oldDoc)
			}));

			this.props.rerenderParent();
		} else if(this.codeMirror?.getValue() != this.props.value) { //update editor contents if brew.text is changed from outside
			this.codeMirror.setValue(this.props.value);
		}
	},

	buildEditor : function() {
		this.codeMirror = CodeMirror(this.refs.editor, {
			lineNumbers       : true,
			lineWrapping      : this.props.wrap,
			indentWithTabs    : true,
			tabSize           : 2,
			historyEventDelay : 250,
			extraKeys         : {
				'Ctrl-B'           : this.makeBold,
				'Cmd-B'            : this.makeBold,
				'Ctrl-I'           : this.makeItalic,
				'Cmd-I'            : this.makeItalic,
				'Ctrl-U'           : this.makeUnderline,
				'Cmd-U'            : this.makeUnderline,
				'Ctrl-.'           : this.makeNbsp,
				'Cmd-.'            : this.makeNbsp,
				'Shift-Ctrl-.'     : this.makeSpace,
				'Shift-Cmd-.'      : this.makeSpace,
				'Shift-Ctrl-,'     : this.removeSpace,
				'Shift-Cmd-,'      : this.removeSpace,
				'Ctrl-M'           : this.makeSpan,
				'Cmd-M'            : this.makeSpan,
				'Shift-Ctrl-M'     : this.makeDiv,
				'Shift-Cmd-M'      : this.makeDiv,
				'Ctrl-/'           : this.makeComment,
				'Cmd-/'            : this.makeComment,
				'Ctrl-K'           : this.makeLink,
				'Cmd-K'            : this.makeLink,
				'Shift-Ctrl-1' : ()=>this.makeHeader(1),
				'Shift-Ctrl-2' : ()=>this.makeHeader(2),
				'Shift-Ctrl-3' : ()=>this.makeHeader(3),
				'Shift-Ctrl-4' : ()=>this.makeHeader(4),
				'Shift-Ctrl-5' : ()=>this.makeHeader(5),
				'Shift-Ctrl-6' : ()=>this.makeHeader(6),
				'Shift-Cmd-1'  : ()=>this.makeHeader(1),
				'Shift-Cmd-2'  : ()=>this.makeHeader(2),
				'Shift-Cmd-3'  : ()=>this.makeHeader(3),
				'Shift-Cmd-4'  : ()=>this.makeHeader(4),
				'Shift-Cmd-5'  : ()=>this.makeHeader(5),
				'Shift-Cmd-6'  : ()=>this.makeHeader(6),
				'Shift-Ctrl-Enter' : this.newColumn,
				'Shift-Cmd-Enter'  : this.newColumn,
				'Ctrl-Enter'       : this.newPage,
				'Cmd-Enter'        : this.newPage,
				'Ctrl-['           : this.foldAllCode,
				'Cmd-['            : this.foldAllCode,
				'Ctrl-]'           : this.unfoldAllCode,
				'Cmd-]'            : this.unfoldAllCode
			},
			foldGutter  : true,
			foldOptions : {
				scanUp      : true,
				rangeFinder : CodeMirror.fold.homebrewery,
				widget      : (from, to)=>{
					let text = '';
					let currentLine = from.line;
					const maxLength = 50;
					while (currentLine <= to.line && text.length <= maxLength) {
						text += this.codeMirror.getLine(currentLine);
						if(currentLine < to.line)
							text += ' ';
						currentLine += 1;
					}

					text = text.trim();
					if(text.length > maxLength)
						text = `${text.substr(0, maxLength)}...`;

					return `\u21A4 ${text} \u21A6`;
				}
			},
			gutters : ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']
		});

		// Note: codeMirror passes a copy of itself in this callback. cm === this.codeMirror. Either one works.
		this.codeMirror.on('change', (cm)=>{this.props.onChange(cm.getValue());});
		this.updateSize();
	},

	makeHeader : function (number) {
		const selection = this.codeMirror.getSelection();
		const header = Array(number).fill('#').join('');
		this.codeMirror.replaceSelection(`${header} ${selection}`, 'around');
		const cursor = this.codeMirror.getCursor();
		this.codeMirror.setCursor({ line: cursor.line, ch: cursor.ch + selection.length + number + 1 });
	},

	makeBold : function() {
		const selection = this.codeMirror.getSelection(), t = selection.slice(0, 2) === '**' && selection.slice(-2) === '**';
		this.codeMirror.replaceSelection(t ? selection.slice(2, -2) : `**${selection}**`, 'around');
		if(selection.length === 0){
			const cursor = this.codeMirror.getCursor();
			this.codeMirror.setCursor({ line: cursor.line, ch: cursor.ch - 2 });
		}
	},

	makeItalic : function() {
		const selection = this.codeMirror.getSelection(), t = selection.slice(0, 1) === '*' && selection.slice(-1) === '*';
		this.codeMirror.replaceSelection(t ? selection.slice(1, -1) : `*${selection}*`, 'around');
		if(selection.length === 0){
			const cursor = this.codeMirror.getCursor();
			this.codeMirror.setCursor({ line: cursor.line, ch: cursor.ch - 1 });
		}
	},

	makeNbsp : function() {
		this.codeMirror.replaceSelection('&nbsp;', 'end');
	},

	makeSpace : function() {
		const selection = this.codeMirror.getSelection();
		const t = selection.slice(0, 8) === '{{width:' && selection.slice(0 -4) === '% }}';
		if(t){
			const percent = parseInt(selection.slice(8, -4)) + 10;
			this.codeMirror.replaceSelection(percent < 90 ? `{{width:${percent}% }}` : '{{width:100% }}', 'around');
		} else {
			this.codeMirror.replaceSelection(`{{width:10% }}`, 'around');
		}
	},

	removeSpace : function() {
		const selection = this.codeMirror.getSelection();
		const t = selection.slice(0, 8) === '{{width:' && selection.slice(0 -4) === '% }}';
		if(t){
			const percent = parseInt(selection.slice(8, -4)) - 10;
			this.codeMirror.replaceSelection(percent > 10 ? `{{width:${percent}% }}` : '', 'around');
		}
	},

	newColumn : function() {
		this.codeMirror.replaceSelection('\n\\column\n\n', 'end');
	},

	newPage : function() {
		this.codeMirror.replaceSelection('\n\\page\n\n', 'end');
	},

	makeUnderline : function() {
		const selection = this.codeMirror.getSelection(), t = selection.slice(0, 3) === '<u>' && selection.slice(-4) === '</u>';
		this.codeMirror.replaceSelection(t ? selection.slice(3, -4) : `<u>${selection}</u>`, 'around');
		if(selection.length === 0){
			const cursor = this.codeMirror.getCursor();
			this.codeMirror.setCursor({ line: cursor.line, ch: cursor.ch - 4 });
		}
	},

	makeSpan : function() {
		const selection = this.codeMirror.getSelection(), t = selection.slice(0, 2) === '{{' && selection.slice(-2) === '}}';
		this.codeMirror.replaceSelection(t ? selection.slice(2, -2) : `{{ ${selection}}}`, 'around');
		if(selection.length === 0){
			const cursor = this.codeMirror.getCursor();
			this.codeMirror.setCursor({ line: cursor.line, ch: cursor.ch - 2 });
		}
	},

	makeDiv : function() {
		const selection = this.codeMirror.getSelection(), t = selection.slice(0, 2) === '{{' && selection.slice(-2) === '}}';
		this.codeMirror.replaceSelection(t ? selection.slice(2, -2) : `{{\n${selection}\n}}`, 'around');
		if(selection.length === 0){
			const cursor = this.codeMirror.getCursor();
			this.codeMirror.setCursor({ line: cursor.line - 1, ch: cursor.ch });  // set to -2? if wanting to enter classes etc.  if so, get rid of first \n when replacing selection
		}
	},

	makeComment : function() {
		let regex;
		let cursorPos;
		let newComment;
		const selection = this.codeMirror.getSelection();
		if(this.props.language === 'gfm'){
			regex = /^\s*(<!--\s?)(.*?)(\s?-->)\s*$/gs;
			cursorPos = 4;
			newComment = `<!-- ${selection} -->`;
		} else {
			regex = /^\s*(\/\*\s?)(.*?)(\s?\*\/)\s*$/gs;
			cursorPos = 3;
			newComment = `/* ${selection} */`;
		}
		this.codeMirror.replaceSelection(regex.test(selection) == true ? selection.replace(regex, '$2') : newComment, 'around');
		if(selection.length === 0){
			const cursor = this.codeMirror.getCursor();
			this.codeMirror.setCursor({ line: cursor.line, ch: cursor.ch - cursorPos });
		};
	},

	makeLink : function() {
		const isLink = /^\[(.*)\]\((.*)\)$/;
		const selection = this.codeMirror.getSelection().trim();
		let match;
		if(match = isLink.exec(selection)){
			const altText = match[1];
			const url     = match[2];
			this.codeMirror.replaceSelection(`${altText} ${url}`);
			const cursor = this.codeMirror.getCursor();
			this.codeMirror.setSelection({ line: cursor.line, ch: cursor.ch - url.length }, { line: cursor.line, ch: cursor.ch });
		} else {
			this.codeMirror.replaceSelection(`[${selection || 'alt text'}](url)`);
			const cursor = this.codeMirror.getCursor();
			this.codeMirror.setSelection({ line: cursor.line, ch: cursor.ch - 4 }, { line: cursor.line, ch: cursor.ch - 1 });
		}
	},

	foldAllCode : function() {
		this.codeMirror.execCommand('foldAll');
	},

	unfoldAllCode : function() {
		this.codeMirror.execCommand('unfoldAll');
	},

	//=-- Externally used -==//
	setCursorPosition : function(line, char){
		setTimeout(()=>{
			this.codeMirror.focus();
			this.codeMirror.doc.setCursor(line, char);
		}, 10);
	},
	getCursorPosition : function(){
		return this.codeMirror.getCursor();
	},
	updateSize : function(){
		this.codeMirror.refresh();
	},
	redo : function(){
		return this.codeMirror.redo();
	},
	undo : function(){
		return this.codeMirror.undo();
	},
	historySize : function(){
		return this.codeMirror.doc.historySize();
	},
	//----------------------//

	render : function(){
		return <div className='codeEditor' ref='editor' style={this.props.style}/>;
	}
});

module.exports = CodeEditor;
