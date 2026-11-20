import { useId, useMemo, useState } from "react";
import ReactQuill from "react-quill-new";

import "react-quill-new/dist/quill.snow.css";
import "../styles/WebsiteHtmlEditor.css";

const normalizeEmptyHtml = (html) => {
    const content = String(html ?? "");
    const emptyParagraphs = /^(\s*<p>(?:\s|<br\s*\/?\s*>|&nbsp;|&#160;)*<\/p>\s*)+$/i;
    return !content.trim() || emptyParagraphs.test(content) ? "" : content;
};

function WebsiteHtmlEditor({
    value = "",
    onChange,
    placeholder = "Write website content...",
    disabled = false,
    minHeight = 240
}) {
    const generatedId = useId();
    const toolbarId = `website-html-toolbar-${generatedId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const [sourceMode, setSourceMode] = useState(false);

    const modules = useMemo(() => ({
        toolbar: {
            container: `#${toolbarId}`,
            handlers: {
                undo() {
                    this.quill.history.undo();
                },
                redo() {
                    this.quill.history.redo();
                },
                insertTable() {
                    this.quill.getModule("table").insertTable(3, 3);
                }
            }
        },
        history: {
            delay: 800,
            maxStack: 100,
            userOnly: true
        },
        table: true
    }), [toolbarId]);

    const editorStyle = {
        "--website-html-editor-min-height": typeof minHeight === "number"
            ? `${minHeight}px`
            : minHeight
    };

    const handleChange = (html) => {
        onChange?.(normalizeEmptyHtml(html));
    };

    return (
        <div className={`website-html-editor${disabled ? " is-disabled" : ""}`} style={editorStyle}>
            <div className="website-html-editor__topbar">
                <span className="website-html-editor__label">Content editor</span>
                <div className="website-html-editor__mode-switch" role="group" aria-label="Editor mode">
                    <button
                        type="button"
                        className={!sourceMode ? "is-active" : ""}
                        aria-pressed={!sourceMode}
                        disabled={disabled}
                        onClick={() => setSourceMode(false)}
                    >
                        Rich text
                    </button>
                    <button
                        type="button"
                        className={sourceMode ? "is-active" : ""}
                        aria-pressed={sourceMode}
                        disabled={disabled}
                        onClick={() => setSourceMode(true)}
                    >
                        HTML
                    </button>
                </div>
            </div>

            {!sourceMode && (
                <div id={toolbarId} className="website-html-editor__toolbar" aria-label="Formatting toolbar">
                    <span className="ql-formats website-html-editor__format-group">
                        <select className="ql-header" defaultValue="" aria-label="Heading style">
                            <option value="">Paragraph</option>
                            <option value="1">Heading 1</option>
                            <option value="2">Heading 2</option>
                            <option value="3">Heading 3</option>
                        </select>
                    </span>

                    <span className="ql-formats website-html-editor__format-group">
                        <button type="button" className="ql-bold" aria-label="Bold" title="Bold" />
                        <button type="button" className="ql-italic" aria-label="Italic" title="Italic" />
                        <button type="button" className="ql-underline" aria-label="Underline" title="Underline" />
                    </span>

                    <span className="ql-formats website-html-editor__format-group">
                        <select className="ql-align" defaultValue="" aria-label="Text alignment">
                            <option value="">Left align</option>
                            <option value="center">Center align</option>
                            <option value="right">Right align</option>
                            <option value="justify">Justify</option>
                        </select>
                    </span>

                    <span className="ql-formats website-html-editor__format-group">
                        <button type="button" className="ql-list" value="ordered" aria-label="Numbered list" title="Numbered list" />
                        <button type="button" className="ql-list" value="bullet" aria-label="Bulleted list" title="Bulleted list" />
                    </span>

                    <span className="ql-formats website-html-editor__format-group">
                        <button type="button" className="ql-link" aria-label="Insert link" title="Insert link" />
                        <button type="button" className="ql-image" aria-label="Insert image" title="Insert image URL" />
                        <button type="button" className="ql-insertTable" aria-label="Insert table" title="Insert 3 by 3 table">
                            <span aria-hidden="true">▦</span>
                        </button>
                    </span>

                    <span className="ql-formats website-html-editor__format-group">
                        <button type="button" className="ql-undo" aria-label="Undo" title="Undo">↶</button>
                        <button type="button" className="ql-redo" aria-label="Redo" title="Redo">↷</button>
                        <button type="button" className="ql-clean" aria-label="Clear formatting" title="Clear formatting" />
                    </span>
                </div>
            )}

            {sourceMode ? (
                <textarea
                    className="website-html-editor__source"
                    aria-label="HTML content"
                    value={String(value ?? "")}
                    onChange={(event) => onChange?.(normalizeEmptyHtml(event.target.value))}
                    placeholder={placeholder}
                    disabled={disabled}
                    spellCheck="false"
                />
            ) : (
                <ReactQuill
                    className="website-html-editor__quill"
                    theme="snow"
                    value={normalizeEmptyHtml(value)}
                    onChange={handleChange}
                    placeholder={placeholder}
                    readOnly={disabled}
                    modules={modules}
                    formats={[
                        "header", "bold", "italic", "underline", "align", "list", "link", "image",
                        "table", "table-row", "table-container"
                    ]}
                />
            )}
        </div>
    );
}

export default WebsiteHtmlEditor;
