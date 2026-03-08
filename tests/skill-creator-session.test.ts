import test from 'node:test';
import assert from 'node:assert/strict';

import {
    SkillCreatorSessions,
    parseSkillCreatorMode,
    isValidSkillSlug,
} from '../src/agent/skill_creator_session.js';

test('parseSkillCreatorMode recognizes supported modes', () => {
    assert.equal(parseSkillCreatorMode('create'), 'create');
    assert.equal(parseSkillCreatorMode('eval'), 'eval');
    assert.equal(parseSkillCreatorMode('improve'), 'improve');
    assert.equal(parseSkillCreatorMode('benchmark'), 'benchmark');
    assert.equal(parseSkillCreatorMode('nada'), null);
});

test('isValidSkillSlug validates kebab-case skill names', () => {
    assert.equal(isValidSkillSlug('review-pr-security'), true);
    assert.equal(isValidSkillSlug('ReviewPR'), false);
    assert.equal(isValidSkillSlug('bad_name'), false);
});

test('SkillCreatorSessions stores and clears session state', () => {
    const sessions = new SkillCreatorSessions();
    sessions.set(1, {
        mode: 'create',
        step: 'await_name',
        data: {},
    });

    assert.equal(sessions.get(1)?.mode, 'create');
    sessions.clear(1);
    assert.equal(sessions.get(1), null);
});
