"use client";

import CodeMirror from "@uiw/react-codemirror";
import { java } from "@codemirror/lang-java";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: string;
}

/** Java 문법 하이라이트가 적용된 코드 입력 에디터 */
export default function CodeEditor({
  value,
  onChange,
  placeholder = "// Java 코드를 입력하세요",
  minHeight = "140px",
}: Props) {
  return (
    <div className="cm-wrap">
      <CodeMirror
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        theme="light"
        extensions={[java()]}
        minHeight={minHeight}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          foldGutter: false,
        }}
      />
    </div>
  );
}
