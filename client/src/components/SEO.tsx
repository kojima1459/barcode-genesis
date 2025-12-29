import { Helmet } from "react-helmet-async";
import { useLanguage } from "@/contexts/LanguageContext";

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    type?: string;
}

export default function SEO({
    title,
    description,
    keywords,
    image = "https://barcodegame-42858.web.app/ogp.png",
    url,
    type = "website"
}: SEOProps) {
    const { language, t } = useLanguage();
    const currentUrl = url || (typeof window !== "undefined" ? window.location.href : "https://barcodegame-42858.web.app/");

    const siteTitle = t("seo_home_title");
    const defaultDesc = t("seo_home_desc");
    const defaultKeywords = t("seo_home_keywords");

    const pageTitle = title ? `${title} | Barcode Genesis` : siteTitle;
    const pageDesc = description || defaultDesc;
    const pageKeywords = keywords || defaultKeywords;

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{pageTitle}</title>
            <meta name="description" content={pageDesc} />
            <meta name="keywords" content={pageKeywords} />
            <html lang={language} />

            {/* Canonical Link */}
            <link rel="canonical" href={currentUrl} />

            {/* Alternate Language Links (hreflang) */}
            <link rel="alternate" hrefLang="ja" href={currentUrl} />
            <link rel="alternate" hrefLang="en" href={currentUrl} />
            <link rel="alternate" hrefLang="x-default" href={currentUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={pageDesc} />
            <meta property="og:image" content={image} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:site_name" content="Barcode Genesis" />
            <meta property="og:locale" content={language === "ja" ? "ja_JP" : "en_US"} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={currentUrl} />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={pageDesc} />
            <meta name="twitter:image" content={image} />

            {/* Structured Data (JSON-LD) */}
            <script type="application/ld+json">
                {JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "WebApplication",
                    "name": "Barcode Genesis",
                    "url": "https://barcodegame-42858.web.app/",
                    "description": pageDesc,
                    "applicationCategory": "GameApplication",
                    "genre": "Barcode Battle RPG",
                    "operatingSystem": "Web, Android, iOS",
                    "inLanguage": ["ja", "en"],
                    "offers": {
                        "@type": "Offer",
                        "price": "0",
                        "priceCurrency": "JPY"
                    }
                })}
            </script>
        </Helmet>
    );
}
