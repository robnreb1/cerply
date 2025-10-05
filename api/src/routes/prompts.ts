import type { FastifyInstance } from 'fastify';
import { listPrompts, getPrompt } from '../promptLoader';

export async function registerPromptsRoutes(app: FastifyInstance) {
  // GET /api/prompts - List all available prompts
  app.get('/api/prompts', async (req, reply) => {
    reply.header('x-api', 'prompts-list');
    reply.header('cache-control', 'public, max-age=300'); // 5 minute cache
    
    try {
      const prompts = listPrompts();
      
      // Transform to match expected format from web tests
      const formattedPrompts = prompts.map(prompt => ({
        id: prompt.id,
        title: prompt.title || prompt.id,
        category: prompt.role || 'general',
        description: prompt.purpose,
        tags: []
      }));
      
      return formattedPrompts;
    } catch (error) {
      app.log.error({ error }, 'Failed to list prompts');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to load prompts'
        }
      });
    }
  });

  // GET /api/prompts/:id - Get specific prompt by ID
  app.get('/api/prompts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    reply.header('x-api', 'prompts-get');
    reply.header('cache-control', 'public, max-age=300'); // 5 minute cache
    
    try {
      const prompt = getPrompt(id);
      
      if (!prompt) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: `Prompt with id '${id}' not found`
          }
        });
      }
      
      return {
        id: prompt.id,
        title: prompt.meta.title || prompt.id,
        category: prompt.meta.role || 'general',
        description: prompt.meta.purpose,
        tags: [],
        template: prompt.template,
        meta: prompt.meta
      };
    } catch (error) {
      app.log.error({ error, id }, 'Failed to get prompt');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to load prompt'
        }
      });
    }
  });
}
