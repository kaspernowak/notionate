import { 
  BlockObjectResponse, 
  BlockObjectRequest
} from '@notionhq/client/build/src/api-endpoints';
import { BlockNormalizer } from './normalizer';
import { RichText, TextRichText, EquationRichText, MentionRichText } from '../../types/notion';

interface BlockContent {
  rich_text?: RichText[];
  color?: string;
  icon?: unknown;
  children?: BlockObjectResponse[];
  [key: string]: unknown;
}

interface NormalizedBlock {
  type: string;
  [key: string]: BlockContent | string;
}

export class BlockComparator {
  constructor(private normalizer: BlockNormalizer) {}

  /**
   * Compares a Martian block with a Notion block for equality
   */
  compare(martianBlock: BlockObjectRequest, notionBlock: BlockObjectResponse): boolean {
    // First check if types match
    if (!martianBlock.type || !notionBlock.type || martianBlock.type !== notionBlock.type) {
      return false;
    }

    // Normalize the Notion block to match Martian's format
    const normalizedNotion = this.normalizer.normalize(notionBlock);
    
    return this.areBlocksIdentical(martianBlock, normalizedNotion);
  }

  /**
   * Checks if two blocks are identical in content
   */
  areBlocksIdentical(
    block1: BlockObjectResponse | BlockObjectRequest,
    block2: BlockObjectResponse | BlockObjectRequest
  ): boolean {
    if (!block1 || !block2) {
      return false;
    }

    // Normalize both blocks
    const normalized1 = this.normalizer.normalize(block1);
    const normalized2 = this.normalizer.normalize(block2);

    // Compare the blocks
    const differences = findBlockDifferences(normalized1, normalized2);
    return differences.length === 0;
  }
}

/**
 * Finds differences between two normalized blocks
 */
function findBlockDifferences(
  block1: NormalizedBlock | BlockObjectResponse | BlockObjectRequest | null,
  block2: NormalizedBlock | BlockObjectResponse | BlockObjectRequest | null,
  path = "",
  context = ""
): string[] {
  if (!block1 || !block2) {
    return [`${context} - ${path}: One block is null`];
  }

  const differences: string[] = [];

  // Compare block types
  if (block1.type !== block2.type) {
    differences.push(
      `${context} - ${path}type: "${block1.type}" !== "${block2.type}"`
    );
    return differences;
  }

  const content1 = block1[block1.type as keyof typeof block1] as BlockContent;
  const content2 = block2[block2.type as keyof typeof block2] as BlockContent;

  // For tables, check table width first
  if (block1.type === "table" && "table_width" in content1 && "table_width" in content2) {
    const width1 = content1.table_width;
    const width2 = content2.table_width;
    if (width1 !== width2) {
      differences.push(
        `${context} - ${path}${block1.type}.table_width: ${width1} !== ${width2}`
      );
      return differences;
    }
  }

  // Compare rich_text if present
  if (content1.rich_text && content2.rich_text) {
    if (content1.rich_text.length !== content2.rich_text.length) {
      differences.push(
        `${context} - ${path}${block1.type}.rich_text: Length mismatch (${content1.rich_text.length} !== ${content2.rich_text.length})`
      );
    } else {
      content1.rich_text.forEach((rt1: RichText, i) => {
        const rt2 = content2.rich_text![i] as RichText;
        
        // Compare types first
        if (rt1.type !== rt2.type) {
          differences.push(
            `${context} - ${path}${block1.type}.rich_text[${i}].type: "${rt1.type}" !== "${rt2.type}"`
          );
          return;
        }

        // Compare plain_text (available on all rich text types)
        if (rt1.plain_text !== rt2.plain_text) {
          differences.push(
            `${context} - ${path}${block1.type}.rich_text[${i}].plain_text: "${rt1.plain_text}" !== "${rt2.plain_text}"`
          );
        }

        // Compare annotations (available on all rich text types)
        Object.entries(rt1.annotations).forEach(([key, value]) => {
          if (rt2.annotations[key as keyof typeof rt2.annotations] !== value) {
            differences.push(
              `${context} - ${path}${block1.type}.rich_text[${i}].annotations.${key}: ${value} !== ${rt2.annotations[key as keyof typeof rt2.annotations]}`
            );
          }
        });

        // Type-specific comparisons
        switch (rt1.type) {
          case 'text':
            if ((rt1 as TextRichText).text.content !== (rt2 as TextRichText).text.content) {
              differences.push(
                `${context} - ${path}${block1.type}.rich_text[${i}].text.content: "${(rt1 as TextRichText).text.content}" !== "${(rt2 as TextRichText).text.content}"`
              );
            }
            break;
          case 'equation':
            if ((rt1 as EquationRichText).equation.expression !== (rt2 as EquationRichText).equation.expression) {
              differences.push(
                `${context} - ${path}${block1.type}.rich_text[${i}].equation.expression: "${(rt1 as EquationRichText).equation.expression}" !== "${(rt2 as EquationRichText).equation.expression}"`
              );
            }
            break;
          case 'mention':
            // For mentions, we'll compare the plain_text which was already done above
            // as mention structures can vary based on mention type
            break;
        }
      });
    }
  }

  // Compare color if present
  if ("color" in content1 || "color" in content2) {
    const color1 = content1.color || "default";
    const color2 = content2.color || "default";
    if (color1 !== color2) {
      differences.push(
        `${context} - ${path}${block1.type}.color: "${color1}" !== "${color2}"`
      );
    }
  }

  // Compare icon if present
  if (content1.icon || content2.icon) {
    if (JSON.stringify(content1.icon) !== JSON.stringify(content2.icon)) {
      differences.push(
        `${context} - ${path}${block1.type}.icon: ${JSON.stringify(
          content1.icon
        )} !== ${JSON.stringify(content2.icon)}`
      );
    }
  }

  // Compare children recursively
  if (content1.children || content2.children) {
    const children1 = content1.children || [];
    const children2 = content2.children || [];

    if (children1.length !== children2.length) {
      differences.push(
        `${context} - ${path}${block1.type}.children: Length mismatch (${children1.length} !== ${children2.length})`
      );
    } else {
      children1.forEach((child1, i) => {
        const child2 = children2[i];
        const childDiffs = findBlockDifferences(
          child1,
          child2,
          `${path}${block1.type}.children[${i}].`,
          context
        );
        differences.push(...childDiffs);
      });
    }
  }

  return differences;
}
