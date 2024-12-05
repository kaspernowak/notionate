import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';
import { ActionInputs, SyncResult, BlockOperationResult, NormalizedBlock } from './notion';
import { MarkdownFile, DirectoryContent } from './markdown';

export {
  ActionInputs,
  SyncResult,
  BlockOperationResult,
  NormalizedBlock,
  MarkdownFile,
  DirectoryContent
};

export type NotionBlock = BlockObjectRequest;
