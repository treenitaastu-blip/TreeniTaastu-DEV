// Custom TypeScript declarations to resolve path mapping issues

declare module '@/*' {
  const content: unknown;
  export default content;
}