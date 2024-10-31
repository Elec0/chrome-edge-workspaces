global.chrome = {
    storage: {
        local: {
            get: async () => { throw new Error("Unimplemented.") },
            set: async () => { jest.fn() },
            clear: async () => { throw new Error("Unimplemented.") }
        }
    },
    windows: {
        onRemoved: {
            addListener: () => { jest.fn(); }
        },
        onCreated: {
            addListener: () => { jest.fn(); }
        },
        update: jest.fn(),
        get: jest.fn()
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
    tabGroups: {
        query: jest.fn()
    },
    runtime: {
        onMessage: {
            addListener: () => { jest.fn(); }
        }
    },
    action: {
        setBadgeText: jest.fn()
    }
};
global.VERSION = "1.0.0";
