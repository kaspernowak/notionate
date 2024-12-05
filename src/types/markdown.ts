export interface MarkdownFile {
  path: string;
  content: string;
  relativePath: string;
  title: string;
}

export interface DirectoryContent {
  files: MarkdownFile[];
  directories: string[];
  readme?: MarkdownFile;
}
