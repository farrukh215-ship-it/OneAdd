import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import type { HomeHeadline, HomeInsights, HomeJoke, HomeWidgetSettings, HomeWeather } from '@tgmg/types';
import { PrismaService } from '../prisma/prisma.service';
import { HomeInsightsQueryDto } from './dto/home-insights.dto';
import { TrackNewsClickDto } from './dto/track-news-click.dto';
import { UpdateHomeWidgetsDto } from './dto/update-home-widgets.dto';

type NewsApiArticle = {
  title?: string;
  url?: string;
  publishedAt?: string;
  source?: { name?: string };
};

type WidgetSettingsRecord = {
  weatherEnabled: boolean;
  jokeEnabled: boolean;
  nationalNewsEnabled: boolean;
  internationalNewsEnabled: boolean;
  gpsWeatherEnabled: boolean;
  heroTitle: string | null;
  heroSubtitle: string | null;
  jokePrefix: string | null;
};

type NewsClickRecord = {
  source: string;
  scope: 'NATIONAL' | 'INTERNATIONAL';
};

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getInsights(query: HomeInsightsQueryDto, user?: User | null): Promise<HomeInsights> {
    const city = query.city?.trim() || user?.city || 'Lahore';
    const countryCode = (query.countryCode?.trim() || 'pk').toLowerCase();
    const widgets = await this.getWidgetSettings();
    const clickPreferences = await this.resolveNewsPreference(user, city);

    const [weather, joke, nationalHeadlines, internationalHeadlines] = await Promise.all([
      widgets.weatherEnabled
        ? this.fetchWeather({
            city,
            countryCode,
            lat: widgets.gpsWeatherEnabled ? query.lat : undefined,
            lng: widgets.gpsWeatherEnabled ? query.lng : undefined,
          })
        : Promise.resolve(null),
      widgets.jokeEnabled ? this.fetchJoke() : Promise.resolve(null),
      widgets.nationalNewsEnabled ? this.fetchNews(countryCode, 'pk', clickPreferences.nationalSources) : Promise.resolve([] as HomeHeadline[]),
      widgets.internationalNewsEnabled ? this.fetchNews('us', countryCode, clickPreferences.internationalSources) : Promise.resolve([] as HomeHeadline[]),
    ]);

    return {
      city,
      weather,
      joke,
      nationalHeadlines,
      internationalHeadlines,
      newsPreference: clickPreferences.preference,
      widgets,
    };
  }

  async trackNewsClick(dto: TrackNewsClickDto, user?: User | null) {
    await (this.prisma as PrismaService & { newsClickLog: { create: (args: unknown) => Promise<unknown> } }).newsClickLog.create({
      data: {
        userId: user?.id,
        city: dto.city,
        scope: dto.scope,
        source: dto.source,
        title: dto.title,
        url: dto.url,
      },
    });

    return { success: true };
  }

  async getAdminWidgetSettings(_user: User): Promise<HomeWidgetSettings> {
    return this.getWidgetSettings();
  }

  async updateWidgetSettings(_user: User, dto: UpdateHomeWidgetsDto): Promise<HomeWidgetSettings> {
    const settings = await (this.prisma as PrismaService & {
      homeWidgetSettings: { upsert: (args: unknown) => Promise<WidgetSettingsRecord> };
    }).homeWidgetSettings.upsert({
      where: { id: 'default' },
      update: dto,
      create: {
        id: 'default',
        ...dto,
      },
    });

    return this.mapWidgetSettings(settings);
  }

  private async getWidgetSettings(): Promise<HomeWidgetSettings> {
    const settings = await (this.prisma as PrismaService & {
      homeWidgetSettings: { upsert: (args: unknown) => Promise<WidgetSettingsRecord> };
    }).homeWidgetSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });

    return this.mapWidgetSettings(settings);
  }

  private mapWidgetSettings(settings: {
    weatherEnabled: boolean;
    jokeEnabled: boolean;
    nationalNewsEnabled: boolean;
    internationalNewsEnabled: boolean;
    gpsWeatherEnabled: boolean;
    heroTitle: string | null;
    heroSubtitle: string | null;
    jokePrefix: string | null;
  }): HomeWidgetSettings {
    return {
      weatherEnabled: settings.weatherEnabled,
      jokeEnabled: settings.jokeEnabled,
      nationalNewsEnabled: settings.nationalNewsEnabled,
      internationalNewsEnabled: settings.internationalNewsEnabled,
      gpsWeatherEnabled: settings.gpsWeatherEnabled,
      heroTitle: settings.heroTitle,
      heroSubtitle: settings.heroSubtitle,
      jokePrefix: settings.jokePrefix,
    };
  }

  private async resolveNewsPreference(user?: User | null, city?: string) {
    type Preference = 'NATIONAL' | 'INTERNATIONAL' | 'BALANCED';
    const where = user?.id ? { userId: user.id } : city ? { city } : undefined;
    if (!where) {
      return {
        preference: 'BALANCED' as Preference,
        nationalSources: [] as string[],
        internationalSources: [] as string[],
      };
    }

    const clicks = (await (this.prisma as PrismaService & {
      newsClickLog: { findMany: (args: unknown) => Promise<NewsClickRecord[]> };
    }).newsClickLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })) as NewsClickRecord[];

    const national = clicks.filter((item: NewsClickRecord) => item.scope === 'NATIONAL');
    const international = clicks.filter((item: NewsClickRecord) => item.scope === 'INTERNATIONAL');

    const preference: Preference =
      national.length > international.length + 1
        ? 'NATIONAL'
        : international.length > national.length + 1
          ? 'INTERNATIONAL'
          : 'BALANCED';

    return {
      preference,
      nationalSources: [...new Set(national.map((item: NewsClickRecord) => item.source))].slice(0, 3) as string[],
      internationalSources: [...new Set(international.map((item: NewsClickRecord) => item.source))].slice(0, 3) as string[],
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

  private async fetchNews(country: string, fallbackCountry: string, preferredSources: string[]): Promise<HomeHeadline[]> {
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
        ? this.rankHeadlines(mapped, preferredSources)
        : this.fallbackHeadlines(country === 'pk' ? 'National' : 'International', fallbackCountry);
    } catch {
      return this.fallbackHeadlines(country === 'pk' ? 'National' : 'International', fallbackCountry);
    }
  }

  private rankHeadlines(headlines: HomeHeadline[], preferredSources: string[]) {
    if (!preferredSources.length) return headlines;
    const scores = new Map(preferredSources.map((source, index) => [source.toLowerCase(), index]));
    return [...headlines].sort((a, b) => {
      const aScore = scores.has(a.source.toLowerCase()) ? scores.get(a.source.toLowerCase())! : 99;
      const bScore = scores.has(b.source.toLowerCase()) ? scores.get(b.source.toLowerCase())! : 99;
      return aScore - bScore;
    });
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
