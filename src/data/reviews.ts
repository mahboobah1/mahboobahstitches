import type { Review } from "./types";

/**
 * Only genuine customer reviews belong here (later: approved reviews from the
 * database). While this list is empty, the homepage testimonial section is hidden.
 */
export const reviews: Review[] = [];
