global.chrome = {
    tabs: {
        query: async () => { throw new Error("Unimplemented.") }
    },
    storage: {
        local: {
            get: async () => { throw new Error("Unimplemented.") },
            set: async () => { throw new Error("Unimplemented.") },
            clear: async () => { throw new Error("Unimplemented.") }
        }
    },
    windows: {
        onRemoved: {
            addListener: () => { jest.fn(); }
        },
        onCreated: {
            addListener: () => { jest.fn(); }
        }
    },
    tabs: {
        onRemoved: {
            addListener: () => { jest.fn(); }
        },
        onCreated: {
            addListener: () => { jest.fn(); }
        },
        query: jest.fn(),
        get: jest.fn()
    },
    runtime: {
        onMessage: {
            addListener: () => { jest.fn(); }
        }
    }
};