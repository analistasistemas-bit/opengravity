export function createPerUserSerialExecutor<T>() {
    const queues = new Map<string, Promise<unknown>>();

    return async (userKey: string, task: () => Promise<T>): Promise<T> => {
        const previous = queues.get(userKey) || Promise.resolve();
        const next = previous.catch(() => undefined).then(task);

        queues.set(userKey, next);

        try {
            return await next;
        } finally {
            if (queues.get(userKey) === next) {
                queues.delete(userKey);
            }
        }
    };
}
