"use client";

import { Button } from "@/components/ui/Button";
import type { Platform } from "@helloadd/database";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type PostMode = "NOW" | "LATER" | "DRAFT";

type CampaignOption = {
  id: string;
  name: string;
};

type AiLanguage = "HINDI" | "ENGLISH" | "HINGLISH";
type AiTone = "PROFESSIONAL" | "CASUAL" | "FESTIVE" | "URGENT";

type AiContentVariants = {
  instagram?: { caption: string; hashtags: string[] };
  facebook?: { post: string };
  linkedin?: { post: string };
  whatsapp?: { message: string };
  adCopy?: {
    headline1: string;
    headline2: string;
    description: string;
  };
};

type OrgLite = {
  allowedPlatforms?: Platform[];
};

type FestivalPreset = {
  name: string;
  date: string;
  prompt: string;
};

const PLATFORM_INFO: Array<{
  key: Platform;
  title: string;
  hint: string;
  color: string;
  maxChars: number;
}> = [
  {
    key: "FACEBOOK",
    title: "Facebook",
    hint: "Feed posts and page engagement",
    color: "#1877F2",
    maxChars: 63206,
  },
  {
    key: "INSTAGRAM",
    title: "Instagram",
    hint: "Posts, reels, stories captions",
    color: "#E1306C",
    maxChars: 2200,
  },
  {
    key: "LINKEDIN",
    title: "LinkedIn",
    hint: "Professional audience updates",
    color: "#0A66C2",
    maxChars: 3000,
  },
  {
    key: "TWITTER",
    title: "Twitter / X",
    hint: "Short format updates",
    color: "#111827",
    maxChars: 280,
  },
  {
    key: "YOUTUBE",
    title: "YouTube",
    hint: "Community or video post support",
    color: "#FF0000",
    maxChars: 5000,
  },
  {
    key: "WHATSAPP",
    title: "WhatsApp",
    hint: "Status or broadcast copy",
    color: "#25D366",
    maxChars: 4096,
  },
  {
    key: "GOOGLE",
    title: "Google",
    hint: "Reserved for future post support",
    color: "#4285F4",
    maxChars: 5000,
  },
];

const FESTIVAL_PRESETS: FestivalPreset[] = [
  { name: "Diwali", date: "2026-11-08", prompt: "Diwali festive offer announcement" },
  { name: "Holi", date: "2026-03-03", prompt: "Holi special campaign post" },
  { name: "Eid", date: "2026-03-21", prompt: "Eid greetings with limited time offer" },
  { name: "Christmas", date: "2026-12-25", prompt: "Christmas celebration and year-end discounts" },
  { name: "New Year", date: "2026-01-01", prompt: "New year growth message and launch offer" },
  { name: "Independence Day", date: "2026-08-15", prompt: "Independence day patriotic campaign" },
  { name: "Republic Day", date: "2026-01-26", prompt: "Republic day brand message with CTA" },
  { name: "IPL Season", date: "2026-04-01", prompt: "IPL season engagement post for sports audience" },
  { name: "Exam Season", date: "2026-02-15", prompt: "Exam season supportive product messaging" },
];

function localDateTimeDefault(minutesAhead = 30) {
  const d = new Date(Date.now() + minutesAhead * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoFromLocalDateTime(local: string): string {
  return new Date(local).toISOString();
}

/**
 * `YYYY-MM-DD` from calendar → `datetime-local` value: 9:00 that day if still in the future,
 * otherwise at least 30 minutes from now, still on that calendar day when possible.
 */
function initialScheduleFromDateParam(dateYmd: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dayStart = new Date(y, mo - 1, d, 0, 0, 0, 0);
  const dayEnd = new Date(y, mo - 1, d, 23, 45, 0, 0);
  if (Number.isNaN(dayStart.getTime())) return null;
  const now = new Date();
  if (dayEnd < now) return null;
  const minT = new Date(now.getTime() + 30 * 60 * 1000);
  let t = new Date(y, mo - 1, d, 9, 0, 0, 0);
  if (t < minT) t = minT;
  if (t > dayEnd) {
    if (minT >= dayStart && minT <= dayEnd) {
      t = minT;
    } else {
      return null;
    }
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`;
}

function SchedulerCreatePageContent() {
  const [content, setContent] = useState("");
  const [mediaUrlsText, setMediaUrlsText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["FACEBOOK"]);
  const [activePreviewPlatform, setActivePreviewPlatform] = useState<Platform>("FACEBOOK");
  const [postMode, setPostMode] = useState<PostMode>("LATER");
  const [scheduledAtLocal, setScheduledAtLocal] = useState(localDateTimeDefault());
  /** When scheduling for later: `none` or daily / weekly / monthly (stored as `recurringSchedule`). */
  const [recurringFrequency, setRecurringFrequency] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [instagramType, setInstagramType] = useState<"FEED" | "STORY" | "REEL">("FEED");
  const [linkedinVisibility, setLinkedinVisibility] = useState<"PUBLIC" | "CONNECTIONS">("PUBLIC");
  const [youtubePrivacy, setYoutubePrivacy] = useState<"PUBLIC" | "PRIVATE" | "UNLISTED">("PUBLIC");
  const [whatsappType, setWhatsappType] = useState<"STATUS" | "BROADCAST">("STATUS");
  const [campaignId, setCampaignId] = useState<string>("");
  const [tagsInput, setTagsInput] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [allowedPlatforms, setAllowedPlatforms] = useState<Platform[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageGenLoading, setImageGenLoading] = useState(false);
  const [imageGenSize, setImageGenSize] = useState<"1024x1024" | "1792x1024" | "1024x1792">("1024x1024");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiLanguage, setAiLanguage] = useState<AiLanguage>("ENGLISH");
  const [aiTone, setAiTone] = useState<AiTone>("PROFESSIONAL");
  const [aiIncludeHashtags, setAiIncludeHashtags] = useState(true);
  const [aiIncludeEmoji, setAiIncludeEmoji] = useState(true);
  const [aiBrandName, setAiBrandName] = useState("");
  const [aiProductName, setAiProductName] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [aiResult, setAiResult] = useState<AiContentVariants | null>(null);

  const searchParams = useSearchParams();
  const dateFromCalendar = searchParams.get("date");

  useEffect(() => {
    if (!dateFromCalendar) return;
    const next = initialScheduleFromDateParam(dateFromCalendar);
    if (next) {
      setScheduledAtLocal(next);
      setPostMode("LATER");
    }
  }, [dateFromCalendar]);

  const upcomingFestival = useMemo(() => {
    const now = new Date();
    const inDays = (iso: string) => {
      const d = new Date(`${iso}T00:00:00`);
      return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };
    const sorted = FESTIVAL_PRESETS.map((f) => ({ ...f, days: inDays(f.date) }))
      .filter((f) => f.days >= 0)
      .sort((a, b) => a.days - b.days);
    return sorted[0] ?? null;
  }, []);

  const mediaUrls = useMemo(
    () =>
      mediaUrlsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [mediaUrlsText]
  );

  const tags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [tagsInput]
  );

  const youtubeSelected = selectedPlatforms.includes("YOUTUBE");
  const youtubeMissingMedia = youtubeSelected && mediaUrls.length === 0;

  const visiblePlatformRows = useMemo(() => {
    if (!allowedPlatforms || allowedPlatforms.length === 0) return PLATFORM_INFO;
    const allow = new Set(allowedPlatforms);
    return PLATFORM_INFO.filter((p) => allow.has(p.key));
  }, [allowedPlatforms]);

  useEffect(() => {
    async function loadContext() {
      try {
        const [orgRes, campaignsRes] = await Promise.all([
          fetch("/api/organization", { credentials: "include", cache: "no-store" }),
          fetch("/api/campaigns?limit=200", { credentials: "include", cache: "no-store" }),
        ]);

        if (orgRes.ok) {
          const org = (await orgRes.json()) as OrgLite;
          if (Array.isArray(org.allowedPlatforms) && org.allowedPlatforms.length > 0) {
            setAllowedPlatforms(org.allowedPlatforms);
            setSelectedPlatforms((prev) => {
              const next = prev.filter((p) => org.allowedPlatforms?.includes(p));
              return next.length > 0 ? next : [org.allowedPlatforms![0]];
            });
            setActivePreviewPlatform((prev) =>
              org.allowedPlatforms?.includes(prev) ? prev : org.allowedPlatforms![0]
            );
          }
        }

        if (campaignsRes.ok) {
          const body = (await campaignsRes.json()) as {
            items?: Array<{ id: string; name: string }>;
          };
          setCampaigns((body.items ?? []).map((c) => ({ id: c.id, name: c.name })));
        }
      } catch {
        setCampaigns([]);
      }
    }
    void loadContext();
  }, []);

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((prev) => {
      const has = prev.includes(platform);
      if (has) {
        const next = prev.filter((p) => p !== platform);
        if (next.length === 0) return prev;
        if (activePreviewPlatform === platform) {
          setActivePreviewPlatform(next[0]);
        }
        return next;
      }
      return [...prev, platform];
    });
  }

  function getPlatformSpecific(platform: Platform) {
    switch (platform) {
      case "INSTAGRAM":
        return { instagramType };
      case "LINKEDIN":
        return { linkedinVisibility };
      case "YOUTUBE":
        return { youtubePrivacy };
      case "WHATSAPP":
        return { whatsappType };
      case "FACEBOOK":
      case "TWITTER":
      case "GOOGLE":
        return {};
      default: {
        const neverPlatform: never = platform;
        return neverPlatform;
      }
    }
  }

  async function createPost(mode: PostMode) {
    if (!content.trim()) {
      toast.error("Write post content first");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }
    if (youtubeMissingMedia) {
      toast.error("YouTube requires at least one video media URL before scheduling.");
      return;
    }

    setLoading(true);
    try {
      const scheduledAtIso =
        mode === "NOW" ? new Date().toISOString() : toIsoFromLocalDateTime(scheduledAtLocal);
      const status = mode === "DRAFT" ? "DRAFT" : "SCHEDULED";

      const recurringOk = mode === "LATER" && recurringFrequency !== "none";

      const createRes = await fetch("/api/posts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          mediaUrls,
          platforms: selectedPlatforms.map((platform) => ({
            platform,
            scheduledAt: scheduledAtIso,
            platformSpecific: getPlatformSpecific(platform),
          })),
          tags,
          campaignId: campaignId || null,
          aiGenerated,
          isRecurring: recurringOk,
          recurringSchedule: recurringOk ? recurringFrequency : null,
        }),
      });

      const createBody = (await createRes.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!createRes.ok || !createBody.id) {
        toast.error(createBody.error ?? "Could not create post");
        return;
      }

      if (status === "DRAFT") {
        await fetch(`/api/posts/${createBody.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platforms: selectedPlatforms.map((platform) => ({
              platform,
              status: "DRAFT",
              scheduledAt: scheduledAtIso,
            })),
          }),
        });
      } else if (mode === "NOW") {
        await fetch(`/api/posts/${createBody.id}/publish-now`, {
          method: "POST",
          credentials: "include",
        });
      }

      toast.success(
        mode === "NOW"
          ? "Post created and publish triggered"
          : mode === "DRAFT"
            ? "Draft saved"
            : "Post scheduled"
      );
    } finally {
      setLoading(false);
    }
  }

  async function generateAiContent() {
    if (!aiTopic.trim()) {
      toast.error("Enter a topic for AI writing");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform first");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/content-writer", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          platforms: selectedPlatforms,
          language: aiLanguage,
          tone: aiTone,
          includeHashtags: aiIncludeHashtags,
          includeEmoji: aiIncludeEmoji,
          brandName: aiBrandName.trim() || undefined,
          productName: aiProductName.trim() || undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        content?: AiContentVariants;
      };
      if (!res.ok || !body.content) {
        toast.error(body.error ?? "AI generation failed");
        return;
      }
      setAiResult(body.content);
      setAiGenerated(true);
      toast.success("AI content generated");
    } finally {
      setAiLoading(false);
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/posts/upload", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !body.url) {
          toast.error(body.error ?? `Upload failed for ${file.name}`);
          continue;
        }
        uploaded.push(body.url);
      }
      if (uploaded.length > 0) {
        setMediaUrlsText((prev) => {
          const lines = prev
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
          return [...lines, ...uploaded].join("\n");
        });
        toast.success(`${uploaded.length} file(s) uploaded`);
      }
    } finally {
      setUploading(false);
    }
  }

  async function generateAiImage() {
    const p = imagePrompt.trim();
    if (p.length < 3) {
      toast.error("Describe the image you want (at least 3 characters)");
      return;
    }
    setImageGenLoading(true);
    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: p,
          size: imageGenSize,
          model: "dall-e-3",
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        toast.error(body.error ?? "Image generation failed");
        return;
      }
      setMediaUrlsText((prev) => {
        const lines = prev
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        return [...lines, body.url!].join("\n");
      });
      toast.success("AI image saved to media — ready to schedule");
    } finally {
      setImageGenLoading(false);
    }
  }

  function applyAiVariant(platform: Platform) {
    if (!aiResult) return;
    switch (platform) {
      case "INSTAGRAM": {
        if (!aiResult.instagram) return;
        const tagsText =
          aiResult.instagram.hashtags && aiResult.instagram.hashtags.length
            ? `\n\n${aiResult.instagram.hashtags.join(" ")}`
            : "";
        setContent(`${aiResult.instagram.caption}${tagsText}`.trim());
        return;
      }
      case "FACEBOOK":
        if (aiResult.facebook?.post) setContent(aiResult.facebook.post);
        return;
      case "LINKEDIN":
        if (aiResult.linkedin?.post) setContent(aiResult.linkedin.post);
        return;
      case "WHATSAPP":
        if (aiResult.whatsapp?.message) setContent(aiResult.whatsapp.message);
        return;
      case "YOUTUBE":
      case "TWITTER":
      case "GOOGLE": {
        if (aiResult.facebook?.post) {
          setContent(aiResult.facebook.post);
          return;
        }
        if (aiResult.instagram?.caption) {
          setContent(aiResult.instagram.caption);
        }
        return;
      }
      default: {
        const neverPlatform: never = platform;
        return neverPlatform;
      }
    }
  }

  const activePlatformMeta = PLATFORM_INFO.find((p) => p.key === activePreviewPlatform);
  const activeMaxChars = activePlatformMeta?.maxChars ?? 3000;
  const activeRemaining = activeMaxChars - content.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-600">Scheduler</p>
          <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900">Create Post</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Compose once and schedule across platforms. Save draft, publish now, or schedule for later.
          </p>
        </div>
        <Link
          href="/scheduler"
          className="inline-flex rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Open scheduler list
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label className="text-sm font-semibold text-neutral-900">Post content</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAiOpen((v) => !v)}
                  className="rounded-lg border border-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  AI Write
                </button>
                <span className={`text-xs ${activeRemaining < 0 ? "text-red-600" : "text-neutral-600"}`}>
                  {activeRemaining} chars left ({activePlatformMeta?.title ?? "Platform"})
                </span>
              </div>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none ring-primary/20 focus:ring"
              placeholder="Write your post copy..."
            />
          </div>

          {aiOpen && (
            <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 flex flex-col gap-1 text-xs font-medium text-neutral-600">
                  Topic
                  <input
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                    placeholder="Diwali offer - 30% off"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                  Language
                  <select
                    value={aiLanguage}
                    onChange={(e) => setAiLanguage(e.target.value as AiLanguage)}
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  >
                    <option value="ENGLISH">English</option>
                    <option value="HINDI">Hindi</option>
                    <option value="HINGLISH">Hinglish</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                  Tone
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value as AiTone)}
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  >
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="CASUAL">Casual</option>
                    <option value="FESTIVE">Festive</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                  Brand name (optional)
                  <input
                    value={aiBrandName}
                    onChange={(e) => setAiBrandName(e.target.value)}
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                  Product name (optional)
                  <input
                    value={aiProductName}
                    onChange={(e) => setAiProductName(e.target.value)}
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-neutral-700">
                  <input
                    type="checkbox"
                    checked={aiIncludeHashtags}
                    onChange={(e) => setAiIncludeHashtags(e.target.checked)}
                  />
                  Include hashtags
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-neutral-700">
                  <input
                    type="checkbox"
                    checked={aiIncludeEmoji}
                    onChange={(e) => setAiIncludeEmoji(e.target.checked)}
                  />
                  Include emoji
                </label>
                <Button type="button" variant="secondary" disabled={aiLoading} onClick={() => void generateAiContent()}>
                  {aiLoading ? "Generating..." : "Generate"}
                </Button>
              </div>

              {upcomingFestival && upcomingFestival.days <= 14 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-900">
                    {upcomingFestival.name} is in {upcomingFestival.days} day(s). Quick prompt:
                  </p>
                  <button
                    type="button"
                    className="mt-1 text-xs font-semibold text-amber-900 underline"
                    onClick={() => setAiTopic(upcomingFestival.prompt)}
                  >
                    Use &quot;{upcomingFestival.prompt}&quot;
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {FESTIVAL_PRESETS.map((festival) => (
                  <button
                    key={festival.name}
                    type="button"
                    className="rounded-full border border-neutral-200 bg-white px-2 py-1 text-[11px] font-semibold text-neutral-700"
                    onClick={() => setAiTopic(festival.prompt)}
                  >
                    {festival.name}
                  </button>
                ))}
              </div>

              {aiResult && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedPlatforms.includes("INSTAGRAM") && aiResult.instagram && (
                    <div className="rounded-xl border border-neutral-200 bg-white p-3">
                      <p className="text-xs font-bold uppercase text-neutral-600">Instagram</p>
                      <p className="mt-1 line-clamp-4 text-sm text-neutral-800">{aiResult.instagram.caption}</p>
                      <button
                        type="button"
                        className="mt-2 text-xs font-semibold text-primary hover:underline"
                        onClick={() => applyAiVariant("INSTAGRAM")}
                      >
                        Use this
                      </button>
                    </div>
                  )}
                  {selectedPlatforms.includes("FACEBOOK") && aiResult.facebook && (
                    <div className="rounded-xl border border-neutral-200 bg-white p-3">
                      <p className="text-xs font-bold uppercase text-neutral-600">Facebook</p>
                      <p className="mt-1 line-clamp-4 text-sm text-neutral-800">{aiResult.facebook.post}</p>
                      <button
                        type="button"
                        className="mt-2 text-xs font-semibold text-primary hover:underline"
                        onClick={() => applyAiVariant("FACEBOOK")}
                      >
                        Use this
                      </button>
                    </div>
                  )}
                  {selectedPlatforms.includes("LINKEDIN") && aiResult.linkedin && (
                    <div className="rounded-xl border border-neutral-200 bg-white p-3">
                      <p className="text-xs font-bold uppercase text-neutral-600">LinkedIn</p>
                      <p className="mt-1 line-clamp-4 text-sm text-neutral-800">{aiResult.linkedin.post}</p>
                      <button
                        type="button"
                        className="mt-2 text-xs font-semibold text-primary hover:underline"
                        onClick={() => applyAiVariant("LINKEDIN")}
                      >
                        Use this
                      </button>
                    </div>
                  )}
                  {selectedPlatforms.includes("WHATSAPP") && aiResult.whatsapp && (
                    <div className="rounded-xl border border-neutral-200 bg-white p-3">
                      <p className="text-xs font-bold uppercase text-neutral-600">WhatsApp</p>
                      <p className="mt-1 line-clamp-4 text-sm text-neutral-800">{aiResult.whatsapp.message}</p>
                      <button
                        type="button"
                        className="mt-2 text-xs font-semibold text-primary hover:underline"
                        onClick={() => applyAiVariant("WHATSAPP")}
                      >
                        Use this
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-900">Media URLs (one per line)</label>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                {uploading ? "Uploading..." : "Upload media"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,video/mp4"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => void uploadFiles(e.target.files)}
                />
              </label>
              <span className="text-xs text-neutral-600">Supports JPG, PNG, WEBP, GIF, MP4 (max 20 MB each)</span>
            </div>
            <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">AI image (OpenAI)</p>
              <p className="mt-1 text-xs text-neutral-600">
                Generate with DALL·E 3 — saved to your workspace like an upload, then scheduled with the post.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="min-w-0 flex-1 text-xs font-medium text-neutral-700">
                  Prompt
                  <input
                    type="text"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="e.g. Minimal product hero for a Diwali skincare sale, warm lighting"
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring"
                    disabled={imageGenLoading}
                  />
                </label>
                <label className="text-xs font-medium text-neutral-700 sm:w-40">
                  Size
                  <select
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm"
                    value={imageGenSize}
                    onChange={(e) =>
                      setImageGenSize(e.target.value as "1024x1024" | "1792x1024" | "1024x1792")
                    }
                    disabled={imageGenLoading}
                  >
                    <option value="1024x1024">1024 × 1024</option>
                    <option value="1792x1024">1792 × 1024 (landscape)</option>
                    <option value="1024x1792">1024 × 1792 (portrait)</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => void generateAiImage()}
                  disabled={imageGenLoading}
                  className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50 sm:shrink-0"
                >
                  {imageGenLoading ? "Generating…" : "Generate image"}
                </button>
              </div>
            </div>
            <textarea
              value={mediaUrlsText}
              onChange={(e) => setMediaUrlsText(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none ring-primary/20 focus:ring"
              placeholder={"https://.../image1.jpg\nhttps://.../video.mp4"}
            />
            <p className="mt-1 text-xs text-neutral-600">
              Media is stored under <code className="rounded bg-neutral-100 px-1">/uploads/scheduler-media</code> when you
              upload or use AI image generation.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-neutral-900">Select platforms</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {visiblePlatformRows.map((platform) => {
                const on = selectedPlatforms.includes(platform.key);
                return (
                  <button
                    key={platform.key}
                    type="button"
                    onClick={() => togglePlatform(platform.key)}
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      on ? "border-primary bg-sky-50 ring-1 ring-primary" : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <p className="text-sm font-bold" style={{ color: platform.color }}>
                      {platform.title}
                    </p>
                    <p className="text-xs text-neutral-600">{platform.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {selectedPlatforms.includes("INSTAGRAM") && (
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Instagram type
                <select
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  value={instagramType}
                  onChange={(e) => setInstagramType(e.target.value as "FEED" | "STORY" | "REEL")}
                >
                  <option value="FEED">Feed</option>
                  <option value="STORY">Story</option>
                  <option value="REEL">Reel</option>
                </select>
              </label>
            )}
            {selectedPlatforms.includes("LINKEDIN") && (
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                LinkedIn visibility
                <select
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  value={linkedinVisibility}
                  onChange={(e) => setLinkedinVisibility(e.target.value as "PUBLIC" | "CONNECTIONS")}
                >
                  <option value="PUBLIC">Public</option>
                  <option value="CONNECTIONS">Connections</option>
                </select>
              </label>
            )}
            {selectedPlatforms.includes("YOUTUBE") && (
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                YouTube privacy
                <select
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  value={youtubePrivacy}
                  onChange={(e) => setYoutubePrivacy(e.target.value as "PUBLIC" | "PRIVATE" | "UNLISTED")}
                >
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                  <option value="UNLISTED">Unlisted</option>
                </select>
              </label>
            )}
            {selectedPlatforms.includes("WHATSAPP") && (
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                WhatsApp type
                <select
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  value={whatsappType}
                  onChange={(e) => setWhatsappType(e.target.value as "STATUS" | "BROADCAST")}
                >
                  <option value="STATUS">Status</option>
                  <option value="BROADCAST">Broadcast</option>
                </select>
              </label>
            )}
          </div>

          {youtubeMissingMedia && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              YouTube is selected but no media URL is provided. Add at least one video URL in Media URLs to publish.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Campaign link (optional)
              <select
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                <option value="">Not linked</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Internal tags (comma separated)
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                placeholder="festive, offer, retargeting"
              />
            </label>
          </div>

          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <p className="text-xs font-bold uppercase text-neutral-600">Schedule options</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPostMode("NOW")}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  postMode === "NOW" ? "bg-primary text-white" : "bg-white text-neutral-700 ring-1 ring-neutral-200"
                }`}
              >
                Post now
              </button>
              <button
                type="button"
                onClick={() => setPostMode("LATER")}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  postMode === "LATER"
                    ? "bg-primary text-white"
                    : "bg-white text-neutral-700 ring-1 ring-neutral-200"
                }`}
              >
                Schedule for later
              </button>
              <button
                type="button"
                onClick={() => setPostMode("DRAFT")}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  postMode === "DRAFT"
                    ? "bg-primary text-white"
                    : "bg-white text-neutral-700 ring-1 ring-neutral-200"
                }`}
              >
                Save draft
              </button>
            </div>
            {postMode === "LATER" && (
              <div className="mt-3 space-y-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                  Scheduled date & time
                  <input
                    type="datetime-local"
                    value={scheduledAtLocal}
                    onChange={(e) => setScheduledAtLocal(e.target.value)}
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                  Repeat (after all platforms publish)
                  <select
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                    value={recurringFrequency}
                    onChange={(e) =>
                      setRecurringFrequency(e.target.value as "none" | "daily" | "weekly" | "monthly")
                    }
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>
                {recurringFrequency !== "none" && (
                  <p className="text-xs text-neutral-600">
                    A cron job must call{" "}
                    <code className="rounded bg-neutral-200 px-1 text-[11px]">/api/cron/process-recurring-posts</code>{" "}
                    so the next run is created after this one finishes publishing.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
            <Button type="button" disabled={loading} onClick={() => void createPost("DRAFT")} variant="secondary">
              {loading && postMode === "DRAFT" ? "Saving..." : "Save draft"}
            </Button>
            <Button type="button" disabled={loading} onClick={() => void createPost(postMode)}>
              {loading ? "Submitting..." : postMode === "NOW" ? "Publish now" : "Schedule post"}
            </Button>
            <span className="text-xs text-neutral-600">{selectedPlatforms.length} platform(s) selected</span>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {selectedPlatforms.map((platform) => {
              const meta = PLATFORM_INFO.find((p) => p.key === platform);
              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setActivePreviewPlatform(platform)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    activePreviewPlatform === platform
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-700"
                  }`}
                >
                  {meta?.title ?? platform}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
            <p className="text-xs font-bold uppercase text-neutral-600">Live preview</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">
              {activePlatformMeta?.title ?? activePreviewPlatform}
            </p>
            <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-3">
              {activePreviewPlatform === "FACEBOOK" && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-neutral-600">Hello Add Page · Just now</p>
                  <p className="whitespace-pre-wrap text-sm text-neutral-800">{content || "Your Facebook post preview..."}</p>
                </div>
              )}
              {activePreviewPlatform === "INSTAGRAM" && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-neutral-600">@helloadd</p>
                  <div className="aspect-square rounded-lg border border-neutral-200 bg-neutral-50" />
                  <p className="whitespace-pre-wrap text-sm text-neutral-800">{content || "Your Instagram caption preview..."}</p>
                </div>
              )}
              {activePreviewPlatform === "LINKEDIN" && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-neutral-600">Hello Add · 1st</p>
                  <p className="whitespace-pre-wrap text-sm text-neutral-800">{content || "Your LinkedIn post preview..."}</p>
                </div>
              )}
              {activePreviewPlatform === "WHATSAPP" && (
                <div className="rounded-lg bg-[#DCF8C6] p-2">
                  <p className="whitespace-pre-wrap text-sm text-neutral-800">{content || "Your WhatsApp message preview..."}</p>
                </div>
              )}
              {(activePreviewPlatform === "TWITTER" ||
                activePreviewPlatform === "YOUTUBE" ||
                activePreviewPlatform === "GOOGLE") && (
                <p className="whitespace-pre-wrap text-sm text-neutral-800">
                  {content || "Your post preview appears here..."}
                </p>
              )}
            </div>
            {mediaUrls.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium text-neutral-600">Media</p>
                {mediaUrls.slice(0, 3).map((url) => (
                  <p key={url} className="truncate text-xs text-neutral-700">
                    {url}
                  </p>
                ))}
                {mediaUrls.length > 3 && (
                  <p className="text-xs text-neutral-600">+{mediaUrls.length - 3} more</p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-900">
            Looks good across selected platforms. Fine-tune per-platform options before final schedule.
          </div>
        </section>
      </div>
    </div>
  );
}

export default function SchedulerCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-sm text-neutral-600">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-neutral-200" />
          <span>Loading scheduler…</span>
        </div>
      }
    >
      <SchedulerCreatePageContent />
    </Suspense>
  );
}
