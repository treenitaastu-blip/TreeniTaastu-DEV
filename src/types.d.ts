// Custom TypeScript declarations to resolve path mapping issues

declare module '@/*' {
  const content: any;
  export default content;
}