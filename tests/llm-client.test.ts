import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildOpenRouterRequestBody,
    getPreferredChatProvider,
    plannerResponseSchema,
} from '../src/agent/llm_client.js';

test('getPreferredChatProvider prefers openrouter when api key exists', () => {
    assert.equal(
        getPreferredChatProvider({
            OPENROUTER_API_KEY: 'or-key',
            GROQ_API_KEY: 'groq-key',
        }),
        'openrouter',
    );
});

test('getPreferredChatProvider falls back to groq when openrouter key is absent', () => {
    assert.equal(
        getPreferredChatProvider({
            GROQ_API_KEY: 'groq-key',
        }),
        'groq',
    );
});

test('buildOpenRouterRequestBody includes configured schema for planner responses', () => {
    const body = buildOpenRouterRequestBody({
        model: 'arcee-ai/trinity-large-preview:free',
        messages: [{ role: 'user', content: 'teste' }],
        temperature: 0,
        responseFormat: plannerResponseSchema,
    });

    assert.equal(body.model, 'arcee-ai/trinity-large-preview:free');
    assert.equal(body.temperature, 0);
    assert.equal(body.response_format?.type, 'json_schema');
    assert.equal(body.response_format?.json_schema?.name, 'planner_response');
});
