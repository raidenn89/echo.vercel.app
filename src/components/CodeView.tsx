const KW = /\b(const|let|var|function|return|if|else|for|while|import|from|export|default|class|new|async|await|def|in|of|true|false|null|None|True|False|type|interface|extends)\b/g;

export function highlight(code: string) {
  const esc = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .replace(/(\/\/.*$|#.*$)/gm, '<span style="color:#6b7280">$1</span>')
    .replace(/("[^"\n]*"|'[^'\n]*'|`[^`]*`)/g, '<span style="color:#a5e8b8">$1</span>')
    .replace(KW, '<span style="color:#c9a8ff">$1</span>')
    .replace(/\b(\d+(\.\d+)?)\b/g, '<span style="color:#ffcf8a">$1</span>');
}

export default function CodeView({ code }: { code: string }) {
  return (
    <pre className="min-h-full bg-black/30 p-5 font-mono text-[13px] leading-relaxed text-neutral-200">
      <code dangerouslySetInnerHTML={{ __html: highlight(code) }} />
    </pre>
  );
}
