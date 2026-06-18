import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";

const isPublicRoute = createRouteMatcher(['/sign-in(.*)']);

export const onRequest = clerkMiddleware((auth, context, next) => {
  if (!isPublicRoute(context.request) && !auth().userId) {
    return auth().redirectToSignIn();
  }
  return next();
});
