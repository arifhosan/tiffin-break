export const initialOf = (name: string): string => (/[A-Za-z]/.exec(name)?.[0] ?? 'Y').toUpperCase()
