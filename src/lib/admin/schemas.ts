import { z } from "zod";

/**
 * The shapes stored in /data/*.json.
 *
 * Every read is validated against these, so a hand-edited file that has drifted
 * fails loudly at the API boundary instead of silently rendering undefined all
 * over the panel.
 */

const isoDate = z.string().max(40).refine((value) => /^\d{4}-\d{2}-\d{2}(?:T[0-9:.]+Z)?$/.test(value) && Number.isFinite(Date.parse(value)), "Please use a valid date.");
const mediaUrl = z.string().trim().max(500).refine((value) => value === "" || /^\/(?:images|video|media|uploads)\/[a-zA-Z0-9_./%-]+$/.test(value) && !value.includes("..") && !/%(?:2e|2f|5c)/i.test(value), "Please choose a website image.");

export const imageSchema = z.object({
  id: z.string(),
  /** Web path under /public, e.g. "/uploads/1712-swiss-lace.jpg". */
  src: z.string().min(1),
  title: z.string().trim().min(1, "Please add a title.").max(120),
  alt: z.string().trim().min(1, "Alt text is required.").max(240),
  category: z.string().trim().max(60).default(""),
  caption: z.string().trim().max(400).default(""),
  /**
   * What the image is for. Gallery images are the swatches on the home page;
   * covers are uploaded from the blog editor and must stay out of that grid,
   * while still being managed and deletable like any other file.
   */
  usage: z.enum(["gallery", "cover"]).default("gallery"),
  /** Set only for files this panel wrote, so delete knows what it may remove. */
  fileName: z.string().nullable().default(null),
  sizeBytes: z.number().int().nonnegative().nullable().default(null),
  uploadedAt: isoDate,
});

export const blogSchema = z.object({
  id: z.string(),
  slug: z
    .string()
    .trim()
    .min(1, "Please add a slug.")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lower case letters, numbers and hyphens only."),
  title: z.string().trim().min(1, "Please add a title.").max(160),
  excerpt: z.string().trim().max(400).default(""),
  /** Shown above the title on the published post, beside the reading time. */
  category: z.string().trim().max(60).default(""),
  content: z.string().max(100000).default(""),
  coverImage: mediaUrl.default(""),
  author: z.string().trim().max(80).default(""),
  publishedDate: isoDate,
  status: z.enum(["draft", "published"]).default("draft"),
  updatedAt: isoDate,
});

export const slotHistoryItemSchema = z.object({
  src: z.string().min(1),
  alt: z.string().trim().max(240).default(""),
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(1000).optional(),
  weave: z.string().trim().max(160).optional(),
  fileName: z.string().nullable().default(null),
  savedAt: isoDate,
});

export type SlotHistoryItem = z.infer<typeof slotHistoryItemSchema>;

/**
 * A replacement image put into one of the design's slots. The id is the slot's
 * own id from lib/slots, holding up to 3 older versions in `history` for restoring.
 */
export const slotSchema = z.object({
  id: z.string().min(1),
  src: z.string().min(1),
  alt: z.string().trim().max(240).default(""),
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(1000).optional(),
  weave: z.string().trim().max(160).optional(),
  /** The uploaded file, so restoring/reverting can manage it. */
  fileName: z.string().nullable().default(null),
  /** Previous revisions (maximum 3), most recent first. */
  history: z.array(slotHistoryItemSchema).default([]),
  updatedAt: isoDate,
});

export const enquirySchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().max(160).default(""),
  subject: z.string().trim().max(200).default(""),
  message: z.string().trim().max(4000).default(""),
  date: isoDate,
  status: z.enum(["unread", "read", "replied"]).default("unread"),
});

export type AdminImage = z.infer<typeof imageSchema>;
export type AdminBlog = z.infer<typeof blogSchema>;
export type AdminEnquiry = z.infer<typeof enquirySchema>;
export type AdminSlot = z.infer<typeof slotSchema>;

export type BlogStatus = AdminBlog["status"];
export type EnquiryStatus = AdminEnquiry["status"];

export const BLOG_STATUSES: readonly BlogStatus[] = ["draft", "published"];
export const ENQUIRY_STATUSES: readonly EnquiryStatus[] = ["unread", "read", "replied"];

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A slug on the way in may be empty.
 *
 * The editor has no slug field: the server derives one from the title and
 * suffixes it if it is taken. A sent slug is still validated, so an empty
 * string means "work it out" rather than "anything goes".
 */
const incomingSlug = z.union([
  z.literal(""),
  z.string().trim().max(120).regex(slugPattern, "Lower case letters, numbers and hyphens only."),
]);

/** The fields a client may send when creating. Ids and stamps are ours. */
export const blogInputSchema = blogSchema.omit({ id: true, updatedAt: true }).extend({ slug: incomingSlug });

export const imagePatchSchema = z
  .object({
    title: z.string().trim().min(1, "Please add a title.").max(120),
    alt: z.string().trim().min(1, "Alt text is required.").max(240),
    category: z.string().trim().max(60),
    caption: z.string().trim().max(400),
  })
  .partial();

export const blogPatchSchema = z
  .object({
    slug: incomingSlug,
    title: z.string().trim().min(1, "Please add a title.").max(160),
    excerpt: z.string().trim().max(400),
    category: z.string().trim().max(60),
    content: z.string().max(100000),
    coverImage: mediaUrl,
    author: z.string().trim().max(80),
    publishedDate: isoDate,
    status: z.enum(["draft", "published"]),
  })
  .partial();

export const slotPatchSchema = z
  .object({
    title: z.string().trim().max(160),
    alt: z.string().trim().max(240),
    description: z.string().trim().max(1000),
    weave: z.string().trim().max(160),
  })
  .partial();

export const enquiryPatchSchema = z.object({ status: z.enum(["unread", "read", "replied"]) }).partial();

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
