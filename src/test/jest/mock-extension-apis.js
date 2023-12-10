global.chrome = {
    tabs: {
        query: async () => { throw new Error("Unimplemented.") }
    },
    storage: {
        local: {
            get: async () => { throw new Error("Unimplemented.") },
            set: async () => { throw new Error("Unimplemented.") }
        }
    },
};