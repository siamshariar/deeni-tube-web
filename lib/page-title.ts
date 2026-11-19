// lib/page-title.ts
import type { Metadata } from "next";

/**
 * Title for nested routes. A parent layout that sets a plain-string title drops the
 * root "%s - Deeni.tube" template for its children, so nested routes set the full title.
 */
export const pageTitle = (title: string): Metadata["title"] => ({ absolute: `${title} - Deeni.tube` });
