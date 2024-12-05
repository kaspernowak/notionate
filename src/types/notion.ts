import { 
  BlockObjectRequest,
  BlockObjectResponse,
  RichTextItemResponse,
  TextRichTextItemResponse
} from '@notionhq/client/build/src/api-endpoints';

// Re-export Notion types
export type { 
  BlockObjectRequest,
  BlockObjectResponse,
  RichTextItemResponse, 
  TextRichTextItemResponse 
};

// Base rich text item type with common properties
export type BaseRichText = {
  plain_text: string;
  href: string | null;
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
};

// Text rich text item
export type TextRichText = BaseRichText & {
  type: 'text';
  text: {
    content: string;
    link: null | { url: string };
  };
};

// Equation rich text item
export type EquationRichText = BaseRichText & {
  type: 'equation';
  equation: {
    expression: string;
  };
};

// Mention rich text item
export type MentionRichText = BaseRichText & {
  type: 'mention';
  mention: {
    type: string;
    [key: string]: any; // Mention can have different properties based on type
  };
};

// Union type of all rich text items
export type RichText = TextRichText | EquationRichText | MentionRichText;

export interface BlockContent {
  rich_text?: RichText[];
  language?: string;
  table_width?: number;
}


/**
 * GitHub Action input parameters
 */
export interface ActionInputs {
  notion_token: string;
  source: string;
  destination_id: string;
  destination_type: 'wiki' | 'database' | 'page';
}

/**
 * Sync result matching action.yml outputs
 */
export interface SyncResult {
  status: 'success' | 'partial' | 'failed';
  updated_pages: string[];
  errors?: string[];
}

// Normalized block for comparison
export interface NormalizedBlock {
  type: string;
  content?: {
    rich_text?: RichText[];
    language?: string;
    table_width?: number;
  };
}

// Block operation result
export interface BlockOperationResult {
  success: boolean;
  error?: string;
  blockId?: string;
}
