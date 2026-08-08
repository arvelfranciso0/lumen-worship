"use client";

import dynamic from "next/dynamic";

// Lazy-loads react-markdown only when the release-notes popover opens.
export const ReleaseNotesMarkdown = dynamic(
  () =>
    Promise.all([import("react-markdown"), import("remark-gfm")]).then(
      ([reactMarkdownModule, remarkGfmModule]) => {
        function ReleaseNotesMarkdownComponent({ children }: { children: string }) {
          const ReactMarkdown = reactMarkdownModule.default;
          return <ReactMarkdown remarkPlugins={[remarkGfmModule.default]}>{children}</ReactMarkdown>;
        }
        return ReleaseNotesMarkdownComponent;
      }
    ),
  { ssr: false }
);
