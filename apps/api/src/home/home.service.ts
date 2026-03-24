import { Injectable } from '@nestjs/common';
import type { HomeHeadline, HomeInsights, HomeJoke, HomeWeather } from '@tgmg/types';
import { HomeInsightsQueryDto } from './dto/home-insights.dto';

type NewsApiArticle = {
  title?: string;
  url?: string;
  publishedAt?: string;
  source?: { name?: string };
};

@Injectable()
export class HomeService {
  async getInsights(query: HomeInsightsQueryDto): Promise<HomeInsights> {
    const city = query.city?.trim() || 'Lahore';
    const countryCode = (query.countryCode?.trim() || 'pk').toLowerCase();

    const [weather, joke, nationalHeadlines, internationalHeadlines] = await Promise.all([
      this.fetchWeather({ city, countryCode, lat: query.lat, lng: query.lng }),
      this.fetchJoke(),
      this.fetchNews(countryCode, 'pk'),
      this.fetchNews('us', countryCode),
    ]);

    return {
      city,
      weather,
      joke,
      nationalHeadlines,
      internationalHeadlines,
    };
  }

  private async fetchWeather({
    city,
    countryCode,
    lat,
    lng,
  }: {
    city: string;
    countryCode: string;
    lat?: number;
    lng?: number;
  }): Promise<HomeWeather | null> {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return null;

    const params = new URLSearchParams({ appid: apiKey, units: 'metric' });
    if (typeof lat === 'number' && typeof lng === 'number') {
      params.set('lat', String(lat));
      params.set('lon', String(lng));
    } else {
      params.set('q', `${city},${countryCode}`);
    }

    try {
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?${params.toString()}`);
      if (!response.ok) throw new Error('weather failed');
      const payload = (await response.json()) as {
        name?: string;
        sys?: { country?: string };
        main?: { temp?: number; feels_like?: number; humidity?: number };
        weather?: Array<{ description?: string; icon?: string }>;
        wind?: { speed?: number };
      };

      return {
        city: payload.name || city,
        country: payload.sys?.country || countryCode.toUpperCase(),
        temperatureC: Math.round(payload.main?.temp ?? 0),
        feelsLikeC: payload.main?.feels_like != null ? Math.round(payload.main.feels_like) : null,
        description: payload.weather?.[0]?.description || 'Clear day',
        iconCode: payload.weather?.[0]?.icon || null,
        humidity: payload.main?.humidity ?? null,
        windSpeed: payload.wind?.speed ?? null,
      };
    } catch {
      return null;
    }
  }

  private async fetchJoke(): Promise<HomeJoke | null> {
    try {
      const response = await fetch('https://official-joke-api.appspot.com/random_joke', {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('joke failed');
      const payload = (await response.json()) as { setup?: string; punchline?: string };
      if (!payload.setup || !payload.punchline) return null;
      return { setup: payload.setup, punchline: payload.punchline };
    } catch {
      return {
        setup: 'Marketplace ka golden rule kya hai?',
        punchline: 'Photo saaf ho, warna buyer sochta hai seller bhi blurry hai.',
      };
    }
  }

  private async fetchNews(country: string, fallbackCountry: string): Promise<HomeHeadline[]> {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      return this.fallbackHeadlines(country === 'pk' ? 'National' : 'International', fallbackCountry);
    }

    const params = new URLSearchParams({
      apiKey,
      category: 'general',
      pageSize: '5',
      country,
    });

    try {
      const response = await fetch(`https://newsapi.org/v2/top-headlines?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('news failed');
      const payload = (await response.json()) as { articles?: NewsApiArticle[] };
      const articles = payload.articles ?? [];
      const mapped = articles
        .map((article) => this.mapHeadline(article))
        .filter((article): article is HomeHeadline => Boolean(article));

      return mapped.length
        ? mapped
        : this.fallbackHeadlines(country === 'pk' ? 'National' : 'International', fallbackCountry);
    } catch {
      return this.fallbackHeadlines(country === 'pk' ? 'National' : 'International', fallbackCountry);
    }
  }

  private mapHeadline(article: NewsApiArticle): HomeHeadline | null {
    if (!article.title || !article.url) return null;
    return {
      title: article.title,
      source: article.source?.name || 'News Desk',
      url: article.url,
      publishedAt: article.publishedAt || null,
    };
  }

  private fallbackHeadlines(scope: string, city: string): HomeHeadline[] {
    return [
      {
        title: `${scope} market watch: ${city} users ke liye trading activity steady hai`,
        source: 'TGMG Brief',
        url: 'https://teragharmeraghar.com',
      },
      {
        title: `${scope} buyers electronics aur vehicles me zyada active dikh rahe hain`,
        source: 'TGMG Brief',
        url: 'https://teragharmeraghar.com',
      },
      {
        title: `${scope} listings trend: verified sellers par trust visibly better hai`,
        source: 'TGMG Brief',
        url: 'https://teragharmeraghar.com',
      },
    ];
  }
}
