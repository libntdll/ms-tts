export { };

declare global {
    var DEBUG: boolean;
}

globalThis.DEBUG = (process.env.DEBUG as string | undefined) === 'true';