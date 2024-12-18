type ScrapeOptions = {
	assets?: boolean;
};

type ScrapeResult = {
	group: string;
	name: string;
	info?: {
		summary?: string;
		description?: string;
	},
	dependencies?: string[];
	assets?: any[];
};

export default function scrape(url: string | URL, opts: ScrapeOptions): ScrapeResult;
