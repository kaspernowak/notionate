import * as core from '@actions/core';
import { ActionInputs } from './types/notion';
import { createNotionService } from './notion';

async function main() {
  try {
    // Get action inputs
    const inputs: ActionInputs = {
      notion_token: core.getInput('notion_token', { required: true }),
      destination_id: core.getInput('destination_id', { required: true }),
      destination_type: 'wiki',
      source: core.getInput('source', { required: true }),
    };

    // Initialize service and start sync
    const service = createNotionService(inputs.notion_token);
    core.info('Starting documentation sync...');
    
    const { notion_token, ...syncConfig } = inputs;
    const result = await service.sync(syncConfig);

    // Log results
    if (result.status === 'success') {
      core.info(`Successfully synced ${result.updated_pages.length} pages`);
    } else if (result.status === 'partial') {
      core.warning(`Partially synced ${result.updated_pages.length} pages with ${result.errors?.length} errors`);
      result.errors?.forEach(error => core.warning(error));
    } else {
      throw new Error(result.errors?.join('\n'));
    }

    // Set output
    core.setOutput('status', result.status);
    core.setOutput('updated_pages', result.updated_pages);
    if (result.errors?.length) {
      core.setOutput('errors', result.errors);
    }
  } catch (error) {
    core.setFailed(`Action failed: ${error}`);
  }
}

main();
