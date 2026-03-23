import * as cheerio from "cheerio";

const BASE_URL = "https://www.rockauto.com";
const CATALOG_URL = `${BASE_URL}/en/catalog/`;
const SEARCH_URL = `${BASE_URL}/en/partsearch/`;

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Sec-Ch-Ua": '"Chromium";v="139", "Google Chrome";v="139", "Not:A-Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Linux"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

export interface Make {
  name: string;
  url: string;
}

export interface Year {
  year: string;
  url: string;
}

export interface Model {
  name: string;
  url: string;
}

export interface Engine {
  description: string;
  carcode: string;
  url: string;
}

export interface Category {
  name: string;
  url: string;
}

export interface Part {
  manufacturer: string;
  partNumber: string;
  price: string;
  description: string;
  moreInfoUrl: string;
}

export interface PartSearchResult {
  manufacturer: string;
  partNumber: string;
  description: string;
  moreInfoUrl: string;
}

export class RockAutoClient {
  private cookies: string[] = [
    "mkt_US=true",
    "mkt_CA=false",
    "mkt_MX=false",
    "ck=1",
    "idlist=0",
  ];
  private nck: string | null = null;

  private async fetch(url: string, init?: RequestInit): Promise<string> {
    const headers: Record<string, string> = {
      ...HEADERS,
      Cookie: this.cookies.join("; "),
      ...(init?.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...init,
      headers,
      redirect: "follow",
    });

    // Capture Set-Cookie headers
    const setCookies = response.headers.getSetCookie?.() ?? [];
    for (const sc of setCookies) {
      const name = sc.split("=")[0];
      this.cookies = this.cookies.filter((c) => !c.startsWith(name + "="));
      this.cookies.push(sc.split(";")[0]);
    }

    return response.text();
  }

  private async ensureSession(): Promise<void> {
    if (this.nck) return;

    const html = await this.fetch(CATALOG_URL);
    const nckMatch = html.match(
      /(?:window\.top\.parent\.window|window)\["?_nck"?\]\s*=\s*"([^"]+)"/
    );
    if (nckMatch) {
      this.nck = nckMatch[1];
    }
  }

  /**
   * Extract all catalog navigation links from HTML with their depth info.
   */
  private allCatalogLinks(
    $: cheerio.CheerioAPI
  ): { name: string; href: string; depth: number }[] {
    const results: { name: string; href: string; depth: number }[] = [];

    $("a.navlabellink").each((_i, el) => {
      const link = $(el);
      const href = link.attr("href") || "";
      if (!href.includes("/catalog/")) return;

      const catalogPath = href.replace(/.*\/catalog\//, "").replace(/\/$/, "");
      const segments = catalogPath.split(",").filter(Boolean);
      const name = link.text().trim();

      if (name) {
        results.push({
          name,
          href: href.startsWith("http") ? href : `${BASE_URL}${href}`,
          depth: segments.length,
        });
      }
    });

    return results;
  }

  /**
   * Extract catalog links at a specific depth.
   */
  private extractCatalogLinks(
    $: cheerio.CheerioAPI,
    expectedDepth: number
  ): { name: string; href: string }[] {
    return this.allCatalogLinks($)
      .filter((l) => l.depth === expectedDepth)
      .map(({ name, href }) => ({ name, href }));
  }

  /**
   * Extract child catalog links - finds all links deeper than currentDepth
   * and returns only those at the shallowest child level.
   * Handles cases where depth jumps (e.g., category depth 6 -> part type depth 8).
   */
  private extractChildCatalogLinks(
    $: cheerio.CheerioAPI,
    currentDepth: number
  ): { name: string; href: string }[] {
    const all = this.allCatalogLinks($).filter((l) => l.depth > currentDepth);
    if (all.length === 0) return [];

    // Find the minimum depth among children
    const minChildDepth = Math.min(...all.map((l) => l.depth));

    return all
      .filter((l) => l.depth === minChildDepth)
      .map(({ name, href }) => ({ name, href }));
  }

  async getMakes(): Promise<Make[]> {
    const html = await this.fetch(CATALOG_URL);
    const $ = cheerio.load(html);

    const links = this.extractCatalogLinks($, 1);

    const seen = new Set<string>();
    return links
      .map((l) => ({ name: l.name, url: l.href }))
      .filter((m) => {
        if (seen.has(m.name)) return false;
        seen.add(m.name);
        return true;
      });
  }

  async getYears(make: string): Promise<Year[]> {
    const slug = this.slugify(make);
    const html = await this.fetch(`${CATALOG_URL}${slug}`);
    const $ = cheerio.load(html);

    // Years are depth 2: make,year
    return this.extractCatalogLinks($, 2)
      .filter((l) => /^\d{4}$/.test(l.name))
      .map((l) => ({ year: l.name, url: l.href }));
  }

  async getModels(make: string, year: string): Promise<Model[]> {
    const slug = `${this.slugify(make)},${year}`;
    const html = await this.fetch(`${CATALOG_URL}${slug}`);
    const $ = cheerio.load(html);

    // Models are depth 3: make,year,model
    return this.extractCatalogLinks($, 3).map((l) => ({
      name: l.name,
      url: l.href,
    }));
  }

  async getEngines(
    make: string,
    year: string,
    model: string
  ): Promise<Engine[]> {
    const slug = `${this.slugify(make)},${year},${this.slugify(model)}`;
    const html = await this.fetch(`${CATALOG_URL}${slug}`);
    const $ = cheerio.load(html);

    // Engines are depth 5: make,year,model,engine_desc,carcode
    return this.extractCatalogLinks($, 5).map((l) => {
      const catalogPath = l.href.replace(/.*\/catalog\//, "").replace(/\/$/, "");
      const segments = catalogPath.split(",");
      return {
        description: l.name,
        carcode: segments[4] || "",
        url: l.href,
      };
    });
  }

  async getCategories(
    make: string,
    year: string,
    model: string,
    engine: string,
    carcode: string
  ): Promise<Category[]> {
    const slug = `${this.slugify(make)},${year},${this.slugify(model)},${this.slugify(engine)},${carcode}`;
    const html = await this.fetch(`${CATALOG_URL}${slug}`);
    const $ = cheerio.load(html);

    // Categories are depth 6: make,year,model,engine,carcode,category
    return this.extractCatalogLinks($, 6).map((l) => ({
      name: l.name,
      url: l.href,
    }));
  }

  async getSubcategories(categoryUrl: string): Promise<Category[]> {
    const html = await this.fetch(categoryUrl);
    const $ = cheerio.load(html);

    const catalogPath = categoryUrl.replace(/.*\/catalog\//, "").replace(/\/$/, "");
    const currentDepth = catalogPath.split(",").filter(Boolean).length;

    return this.extractChildCatalogLinks($, currentDepth).map((l) => ({
      name: l.name,
      url: l.href,
    }));
  }

  async getParts(partTypeUrl: string): Promise<Part[]> {
    const html = await this.fetch(partTypeUrl);
    const $ = cheerio.load(html);
    return this.extractParts($);
  }

  async searchByPartNumber(partNumber: string): Promise<PartSearchResult[]> {
    await this.ensureSession();

    const body = new URLSearchParams();
    body.set("_nck", this.nck || "");
    body.set("dopartsearch", "1");
    body.set("partsearch[partnum][partsearch_007]", partNumber);
    body.set("partsearch[do][partsearch_007]", "Search");

    const html = await this.fetch(SEARCH_URL, {
      method: "POST",
      body: body.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        Referer: `${BASE_URL}/en/partsearch/`,
      },
    });

    const $ = cheerio.load(html);
    const parts = this.extractParts($);

    return parts.map((p) => ({
      manufacturer: p.manufacturer,
      partNumber: p.partNumber,
      description: p.description,
      moreInfoUrl: p.moreInfoUrl,
    }));
  }

  async getPartDetails(moreInfoUrl: string): Promise<Record<string, string>> {
    const html = await this.fetch(moreInfoUrl);
    const $ = cheerio.load(html);
    const details: Record<string, string> = {};

    // Extract sections with aria-label attributes
    $("section[aria-label]").each((_i, el) => {
      const label = $(el).attr("aria-label") || "";
      const content = $(el).text().trim();
      if (label && content) {
        details[label] = content;
      }
    });

    // Extract table-based specs
    $("table.listing-inner tr, table tr").each((_i, el) => {
      const cells = $(el).find("td");
      if (cells.length >= 2) {
        const key = $(cells[0]).text().trim();
        const val = $(cells[1]).text().trim();
        if (key && val) {
          details[key] = val;
        }
      }
    });

    return details;
  }

  async browseByUrl(url: string): Promise<{
    navigation: Category[];
    parts: Part[];
  }> {
    const html = await this.fetch(url);
    const $ = cheerio.load(html);

    // Determine current depth from the URL to find child links
    const catalogPath = url.replace(/.*\/catalog\//, "").replace(/\/$/, "");
    const currentDepth = catalogPath.split(",").filter(Boolean).length;

    // Get child navigation links at the next available depth
    const navigation = this.extractChildCatalogLinks($, currentDepth).map(
      (l) => ({ name: l.name, url: l.href })
    );

    const parts = this.extractParts($);

    return { navigation, parts };
  }

  private extractParts($: cheerio.CheerioAPI): Part[] {
    const parts: Part[] = [];

    // Primary: tbody.listing-inner elements (desktop catalog pages)
    $("tbody.listing-inner").each((_i, el) => {
      const tbody = $(el);
      const part = this.parsePartFromElement($, tbody);
      if (part) parts.push(part);
    });

    // Fallback: tr-based patterns
    if (parts.length === 0) {
      $("tr.listing-inner-row, tr[id*='listingcontainer']").each((_i, el) => {
        const part = this.parsePartFromElement($, $(el));
        if (part) parts.push(part);
      });
    }

    // Fallback: div-based patterns
    if (parts.length === 0) {
      $("div.listing-container").each((_i, el) => {
        const part = this.parsePartFromElement($, $(el));
        if (part) parts.push(part);
      });
    }

    return parts;
  }

  private parsePartFromElement(
    $: cheerio.CheerioAPI,
    el: cheerio.Cheerio<any>
  ): Part | null {
    const manufacturer =
      el.find("span.listing-final-manufacturer").first().text().trim() ||
      el.find("span.listing-final-manufacturer-name").first().text().trim();
    const partNumber =
      el.find("span.listing-final-partnumber").first().text().trim();

    if (!manufacturer && !partNumber) return null;

    // Price is loaded via AJAX, but try to extract from supplemental data
    let price = el.find("span.listing-price").first().text().trim();

    // Also try to extract quality tier from the supplemental JSON
    let tier = "";
    const supplementalInput = el.find("input[id^='listing_data_supplemental']");
    if (supplementalInput.length) {
      try {
        const data = JSON.parse(
          supplementalInput.attr("value")?.replace(/&quot;/g, '"') || "{}"
        );
        if (data.sortgrouptext) tier = data.sortgrouptext;
      } catch {
        // ignore parse errors
      }
    }

    const description = el
      .find("div.listing-text-row")
      .map((_j, d) => {
        // Clean the text, removing flag image alts and link texts
        const text = $(d).text().trim()
          .replace(/Flag indicates.*?worldwide\.\s*/g, "")
          .trim();
        return text;
      })
      .get()
      .filter(Boolean)
      .join(" | ");

    const moreInfoLink =
      el.find("a.ra-btn-moreinfo, a.more-info-link").attr("href") || "";

    return {
      manufacturer,
      partNumber,
      price: price || (tier ? `[${tier}]` : ""),
      description,
      moreInfoUrl: moreInfoLink.startsWith("http")
        ? moreInfoLink
        : moreInfoLink
          ? `${BASE_URL}${moreInfoLink}`
          : "",
    };
  }

  private slugify(text: string): string {
    return text.toLowerCase().replace(/\s+/g, "+").replace(/&/g, "+%26+");
  }
}
