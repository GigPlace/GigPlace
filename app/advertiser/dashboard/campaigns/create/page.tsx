"use client";

import {
  useEffect,
  useState,
  type ComponentType,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Globe,
  Camera,
  MessageCircle,
  Search,
  Send,
  UserPlus,
  Users,
  Play,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================================
   TYPES
========================================= */

type CampaignCategory = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number | null;
};

type CampaignSubcategory = {
  id: string;
  category_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number | null;
};

type CampaignSelection = {
  advertiserId: string;
  category: {
    id: string;
    name: string;
    slug: string | null;
  };
  subcategory: {
    id: string;
    name: string;
    slug: string | null;
  };
};

/* =========================================
   CATEGORY ICONS
========================================= */

const categoryIcons: Record<
  string,
  ComponentType<{ size?: number; className?: string }>
> = {
  "sign-up": UserPlus,
  "whatsapp-telegram": Send,
  "instagram-tiktok": Camera,
  youtube: Play,
  "seo-website": Globe,
  discord: MessageCircle,
  facebook: Users,
  "search-review": Search,
};

/* =========================================
   PAGE
========================================= */

export default function CreateCampaignPage() {
  const router = useRouter();

  const [advertiserId, setAdvertiserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CampaignCategory[]>([]);
  const [subcategories, setSubcategories] = useState<CampaignSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CampaignCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<CampaignSubcategory | null>(null);

  useEffect(() => {
    initialisePage();
  }, []);

  const initialisePage = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      setAdvertiserId(user.id);

      // Clear any old campaign selection when this page opens
      sessionStorage.removeItem("campaignSelection");
      sessionStorage.removeItem("gigplace_campaign_draft");
      localStorage.removeItem("campaignSelection");
      localStorage.removeItem("gigplace_campaign_draft");

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("campaign_categories")
        .select("id, name, slug, description, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (categoriesError) throw categoriesError;

      const { data: subcategoriesData, error: subcategoriesError } =
        await supabase
          .from("campaign_subcategories")
          .select(
            "id, category_id, name, slug, description, is_active, sort_order"
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

      if (subcategoriesError) throw subcategoriesError;

      setCategories(categoriesData || []);
      setSubcategories(subcategoriesData || []);

      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setExpandedCategoryId(null);
    } catch (err: unknown) {
      console.error("Campaign category error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load campaign categories."
      );
    } finally {
      setLoading(false);
    }
  };

  const getSubcategories = (categoryId: string) =>
    subcategories.filter((s) => s.category_id === categoryId);

  const handleSelectCategory = (category: CampaignCategory) => {
    const isCurrentlyOpen = expandedCategoryId === category.id;

    if (isCurrentlyOpen) {
      // Collapse if already open
      setExpandedCategoryId(null);
      return;
    }

    // Open this category and show its subcategories
    setExpandedCategoryId(category.id);
    setSelectedCategory(category);
    setError(null);

    const categorySubs = getSubcategories(category.id);

    // Auto-select if there is only one subcategory
    if (categorySubs.length === 1) {
      setSelectedSubcategory(categorySubs[0]);
    } else {
      // Clear previous subcategory when switching categories
      setSelectedSubcategory(null);
    }

    // Smooth scroll to the expanded section after a short delay
    setTimeout(() => {
      const el = document.getElementById(`category-${category.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 100);
  };

 const handleSelectSubcategory = (
  category: CampaignCategory,
  subcategory: CampaignSubcategory
) => {
  if (!advertiserId) {
    setError("You must be signed in to create a campaign.");
    router.replace("/login");
    return;
  }

  setSelectedCategory(category);
  setSelectedSubcategory(subcategory);
  setExpandedCategoryId(category.id);
  setError(null);

  const selection: CampaignSelection = {
    advertiserId,
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
    },
    subcategory: {
      id: subcategory.id,
      name: subcategory.name,
      slug: subcategory.slug,
    },
  };

  sessionStorage.setItem("campaignSelection", JSON.stringify(selection));
  router.push("/advertiser/dashboard/campaigns/create/details");
};

  const handleContinue = () => {
    if (!selectedCategory || !selectedSubcategory) {
      setError(
        "Please select a category and subcategory before continuing."
      );
      return;
    }

    if (!advertiserId) {
      setError("You must be signed in to create a campaign.");
      router.replace("/login");
      return;
    }

    const selection: CampaignSelection = {
      advertiserId,
      category: {
        id: selectedCategory.id,
        name: selectedCategory.name,
        slug: selectedCategory.slug,
      },
      subcategory: {
        id: selectedSubcategory.id,
        name: selectedSubcategory.name,
        slug: selectedSubcategory.slug,
      },
    };

    sessionStorage.setItem("campaignSelection", JSON.stringify(selection));
    router.push("/advertiser/dashboard/campaigns/create/details");
  };

  /* ---------- LOADING ---------- */
  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0b3939]/10">
            <Loader2 size={28} className="animate-spin text-[#0b3939]" />
          </div>
          <div className="text-center">
            <h2 className="font-semibold text-gray-900">Loading categories</h2>
            <p className="mt-1 text-sm text-gray-500">
              Please wait while campaign categories are loaded.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ---------- ERROR (no data) ---------- */
  if (error && categories.length === 0) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <AlertCircle size={28} className="text-red-600" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-red-900">
            Unable to load categories
          </h2>
          <p className="mt-2 text-sm leading-6 text-red-700">{error}</p>
          <button
            type="button"
            onClick={initialisePage}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b3939] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#062b2b]"
          >
            <RefreshCw size={17} />
            Try Again
          </button>
        </div>
      </main>
    );
  }

  /* ---------- MAIN ---------- */
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl">
        {/* BACK */}
        <button
          type="button"
          onClick={() => router.push("/advertiser/dashboard/campaigns")}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-[#0b3939]"
        >
          <ArrowLeft size={18} />
          Back to Campaigns
        </button>

        {/* HEADING */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b3939] text-sm font-bold text-white">
              1
            </span>
            <div>
              <p className="text-sm font-medium text-[#0b3939]">Step 1 of 3</p>
              <h1 className="md:text-3xl text-xl font-bold text-[#0B3939]">
                Select a Category
              </h1>
            </div>
          </div>
          <p className="max-w-2xl text-xs md:text-sm text-[#0B3939]">
            Click a category to instantly see its subcategories, then choose the
            service that best describes your campaign.
          </p>
        </div>

        {/* PROGRESS */}
        <div className="mb-10">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-[#0b3939]">Category</span>
            <span className="text-gray-400">Campaign Details</span>
            <span className="text-gray-400">Review</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full w-1/3 rounded-full bg-[#0b3939]" />
          </div>
        </div>

        {/* NOTICE */}
        <div className="mb-8 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <CheckCircle2
            size={21}
            className="mt-0.5 shrink-0 text-amber-600"
          />
          <div>
            <h2 className="font-semibold text-sm md:text-lg text-amber-900">Choose carefully</h2>
            <p className="mt-1 md:text-sm text-xs text-amber-800">
              Select the category and subcategory that best match your campaign.
            </p>
          </div>
        </div>

        {/* CATEGORIES */}
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <Search size={45} className="mx-auto text-gray-300" />
            <h2 className="mt-5 text-xl font-bold text-gray-900">
              No categories available
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Campaign categories have not been added yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => {
              const Icon = categoryIcons[category.slug || ""] || Globe;
              const isExpanded = expandedCategoryId === category.id;
              const categorySubcategories = getSubcategories(category.id);
              const isSelectedCategory = selectedCategory?.id === category.id;

              return (
                <div
                  key={category.id}
                  id={`category-${category.id}`}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${
                    isExpanded
                      ? "border-[#0b3939]/40 shadow-md"
                      : "border-gray-200 hover:border-[#0b3939]/25"
                  }`}
                >
                  {/* Whole header is clickable */}
                  <button
                    type="button"
                    onClick={() => handleSelectCategory(category)}
                    className="w-full p-6 text-left"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition ${
                            isSelectedCategory
                              ? "bg-[#0b3939] text-white"
                              : "bg-[#0b3939]/10 text-[#0b3939]"
                          }`}
                        >
                          <Icon size={25} />
                        </div>
                        <div>
                          <h2 className="md:text-xl text-lg font-bold text-[#0B3939]">
                            {category.name}
                          </h2>
                          <p className="mt-2 max-w-2xl text-xs md:text-sm leading-5 text-[#0B3939]">
                            {category.description ||
                              "Click to view available subcategories."}
                          </p>
                          <p className="mt-2 text-xs font-medium text-[#0b3939]">
                            {categorySubcategories.length} subcategor
                            {categorySubcategories.length === 1 ? "y" : "ies"}{" "}
                            available
                          </p>
                        </div>
                      </div>

                      <div className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#0b3939]/20 bg-[#0b3939]/5 px-5 py-2 text-sm font-semibold text-[#0b3939]">
                        {isExpanded ? (
                          <>
                            Hide subcategories
                            <ChevronUp size={17} />
                          </>
                        ) : (
                          <>
                            View subcategories
                            <ChevronDown size={17} />
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Subcategories appear automatically when category is selected */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-[#f7faf9] p-6">
                      <div className="mb-5">
                        <h3 className="font-bold text-gray-900">
                          Select a subcategory
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Choose one option that best describes your campaign.
                        </p>
                      </div>

                      {categorySubcategories.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
                          <p className="text-sm text-gray-500">
                            No active subcategories are available for this
                            category.
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {categorySubcategories.map((subcategory) => {
                            const isSelected =
                              selectedSubcategory?.id === subcategory.id;

                            return (
                              <button
                                key={subcategory.id}
                                type="button"
                                onClick={() =>
                                  handleSelectSubcategory(category, subcategory)
                                }
                                className={`flex min-h-20 items-center gap-3 rounded-xl border p-4 text-left transition ${
                                  isSelected
                                    ? "border-[#0b3939] bg-[#0b3939]/10"
                                    : "border-gray-200 bg-white hover:border-[#0b3939]/40"
                                }`}
                              >
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                                    isSelected
                                      ? "border-[#0b3939] bg-[#0b3939] text-white"
                                      : "border-gray-300 bg-white"
                                  }`}
                                >
                                  {isSelected ? (
                                    <Check size={15} />
                                  ) : (
                                    <Circle
                                      size={10}
                                      className="text-transparent"
                                    />
                                  )}
                                </span>
                                <div>
                                  <h4 className="font-semibold text-gray-900">
                                    {subcategory.name}
                                  </h4>
                                  {subcategory.description && (
                                    <p className="mt-1 text-xs leading-5 text-gray-500">
                                      {subcategory.description}
                                    </p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* SELECTED SUMMARY + CONTINUE */}
        {selectedCategory && selectedSubcategory && (
          <div className="mt-8 flex flex-col gap-5 rounded-2xl border border-[#0b3939]/20 bg-[#0b3939]/5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0b3939] text-white">
                <Check size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#0b3939]">
                  Selected campaign type
                </p>
                <h3 className="mt-1 text-lg font-bold text-gray-900">
                  {selectedCategory.name}
                  <span className="mx-2 text-gray-400">/</span>
                  {selectedSubcategory.name}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b3939] px-7 py-4 text-sm font-semibold text-white transition hover:bg-[#062b2b]"
            >
              Continue
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* VALIDATION ERROR */}
        {error && categories.length > 0 && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}