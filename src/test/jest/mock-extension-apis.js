global.chrome = {
    storage: {
        local: {
            get: async () => { throw new Error("Unimplemented.") },
            set: async () => { jest.fn() },
            clear: async () => { throw new Error("Unimplemented.") }
        },
        sync: {
            set: jest.fn(),
            get: jest.fn(),
            remove: jest.fn(),
            QUOTA_BYTES_PER_ITEM: 8192,
            MAX_WRITE_OPERATIONS_PER_HOUR: 1800,
            MAX_WRITE_OPERATIONS_PER_MINUTE: 120
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
