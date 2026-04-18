/**
 * Next.js 15+ App Router: `context.params` in route handlers is a Promise.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/route#context-optional
 */
export type AppRouteCtx<T extends Record<string, string>> = {
  params: Promise<T>;
};
