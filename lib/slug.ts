export const slugify = (text: string) =>
    text
        .replace(/\s+/g, "_")  

export const unslugify = (slug: string) =>
    slug
        .replace(/_/g, " ")