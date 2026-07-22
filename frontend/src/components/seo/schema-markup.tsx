export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name: "PayAfrika",
    description:
      "One secure platform for loans, cross-border payments, digital currency exchange, import & export services, and business growth across Africa.",
    url: "https://payafrika.com",
    logo: "https://payafrika.com/logo.png",
    sameAs: [
      "https://linkedin.com/company/payafrika",
      "https://twitter.com/payafrika",
      "https://facebook.com/payafrika",
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: "Sandton",
      addressLocality: "Johannesburg",
      addressCountry: "ZA",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+27-87-551-0123",
      contactType: "customer service",
      availableLanguage: ["English"],
    },
    areaServed: {
      "@type": "Country",
      name: "South Africa",
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `https://payafrika.com${item.url}`,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function FAQSchema({ items }: { items: { question: string; answer: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
