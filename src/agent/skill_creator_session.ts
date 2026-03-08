export type SkillCreatorMode = 'create' | 'eval' | 'improve' | 'benchmark';

export type SkillCreatorCreateData = {
    name?: string;
    description?: string;
    trigger?: string;
    outputFormat?: string;
    withEvals?: boolean;
};

export type SkillCreatorRunData = {
    skillName?: string;
    evalPrompts?: string[];
    runs?: number;
};

export type SkillCreatorSession = {
    mode: SkillCreatorMode;
    step: string;
    data: SkillCreatorCreateData | SkillCreatorRunData;
};

export function parseSkillCreatorMode(text: string): SkillCreatorMode | null {
    const normalized = text.trim().toLowerCase();
    if (normalized === 'create') return 'create';
    if (normalized === 'eval') return 'eval';
    if (normalized === 'improve') return 'improve';
    if (normalized === 'benchmark') return 'benchmark';
    return null;
}

export function isValidSkillSlug(value: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export class SkillCreatorSessions {
    private readonly sessions = new Map<number, SkillCreatorSession>();

    get(userId: number): SkillCreatorSession | null {
        return this.sessions.get(userId) || null;
    }

    set(userId: number, session: SkillCreatorSession) {
        this.sessions.set(userId, session);
    }

    clear(userId: number) {
        this.sessions.delete(userId);
    }
}
