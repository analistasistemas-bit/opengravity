import test from 'node:test';
import assert from 'node:assert/strict';

import { TTSService } from '../src/agent/tts_service.js';

test('isElevenLabsPaidPlanRequired detects API paid-plan errors', () => {
    const body = '{"detail":{"code":"paid_plan_required","message":"upgrade required"}}';
    assert.equal(TTSService.isElevenLabsPaidPlanRequired(402, body), true);
    assert.equal(TTSService.isElevenLabsPaidPlanRequired(400, body), false);
    assert.equal(TTSService.isElevenLabsPaidPlanRequired(402, '{"detail":"other"}'), false);
});
