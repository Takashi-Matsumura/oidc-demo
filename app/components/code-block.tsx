"use client";

type Props = {
  children: string;
  language?: string;
  title?: string;
};

export default function CodeBlock({ children, title }: Props) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {title && (
        <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-medium text-zinc-500">{title}</span>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed bg-zinc-50 dark:bg-zinc-950">
        <code className="text-zinc-800 dark:text-zinc-200">{children}</code>
      </pre>
    </div>
  );
}
