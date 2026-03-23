export const slugify = (text: string) =>
    text
        .replace(/\s+/g, "_")  
        .replace(/\//g, "--")

export const unslugify = (slug: string) =>
    slug
        .replace(/--/g, "/")
        .replace(/_/g, " ");