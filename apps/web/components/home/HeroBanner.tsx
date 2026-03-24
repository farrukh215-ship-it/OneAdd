'use client';

import type { HomeHeadline, HomeInsights } from '@tgmg/types';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';

function weatherIconUrl(iconCode?: string | null) {
  if (!iconCode) return null;
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

function parseStoredGeo() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('tgmg_geo');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number };
    if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') return parsed;
  } catch {
    return null;
  }
  return null;
}

export function HeroBanner({
  initialInsights,
  city,
}: {
  initialInsights: HomeInsights;
  city: string;
}) {
  const { currentUser } = useAuth();
  const [insights, setInsights] = useState<HomeInsights>(initialInsights);
  const [geoRequested, setGeoRequested] = useState(false);

  const preferredCity = currentUser?.city || (typeof window !== 'undefined' ? window.localStorage.getItem('tgmg_city') : null) || city;

  useEffect(() => {
    let cancelled = false;

    const loadInsights = async (params: { city?: string; lat?: number; lng?: number }) => {
      try {
        const response = await api.get<HomeInsights>('/home/insights', {
          params: {
            city: params.city || preferredCity,
            lat: params.lat,
            lng: params.lng,
            countryCode: 'pk',
          },
        });
        if (!cancelled) setInsights(response.data);
      } catch {
        // Keep initial server-rendered state.
      }
    };

    const storedGeo = parseStoredGeo();
    if (storedGeo) {
      void loadInsights({ city: preferredCity, lat: storedGeo.lat, lng: storedGeo.lng });
      return () => {
        cancelled = true;
      };
    }

    if (!geoRequested && typeof navigator !== 'undefined' && navigator.geolocation) {
      setGeoRequested(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextGeo = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          window.localStorage.setItem('tgmg_geo', JSON.stringify(nextGeo));
          void loadInsights({ city: preferredCity, ...nextGeo });
        },
        () => {
          void loadInsights({ city: preferredCity });
        },
        { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 },
      );
    } else {
      void loadInsights({ city: preferredCity });
    }

    return () => {
      cancelled = true;
    };
  }, [preferredCity, currentUser?.city, geoRequested]);

  const weather = insights.weather;
  const weatherIcon = weatherIconUrl(weather?.iconCode);
  const heroTitle =
    insights.widgets.heroTitle ||
    (weather ? `${weather.city} ka mausam, fresh joke aur top headlines ek hi jagah.` : 'Har dafa app kholte hi fresh city pulse milay ga.');
  const heroSubtitle =
    insights.widgets.heroSubtitle ||
    'Weather OpenWeather se, joke live feed se, aur headlines real-time news stream se. Aap jahan ho, homepage wahi se start hota hai.';

  const jokeText = useMemo(() => {
    if (!insights.joke) return null;
    return `${insights.widgets.jokePrefix || 'Daily Joke Drop'}: ${insights.joke.setup} ${insights.joke.punchline}`;
  }, [insights.joke, insights.widgets.jokePrefix]);

  const trackClick = async (headline: HomeHeadline, scope: 'NATIONAL' | 'INTERNATIONAL') => {
    try {
      await api.post('/home/news-click', {
        city: weather?.city || insights.city,
        scope,
        source: headline.source,
        title: headline.title,
        url: headline.url,
      });
    } catch {
      // Click should not block navigation.
    }
  };

  return (
    <section className="mx-2 mt-4 overflow-hidden rounded-[30px] border border-[#f2c6bf] bg-[radial-gradient(circle_at_top_left,#ffe7d4_0%,#fff4ef_24%,#f7fafc_58%,#eef5ff_100%)] px-5 py-6 text-[#172033] shadow-[0_18px_52px_rgba(18,34,61,0.12)] md:mx-5 md:px-8 md:py-8">
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.95fr)]">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#ff8a65]/18 blur-3xl" />
        <div className="absolute left-10 top-10 h-28 w-28 rounded-full bg-[#7cb9ff]/14 blur-3xl" />
        <div className="relative z-[1]">
          <div className="inline-flex rounded-full border border-[#ffd7ca] bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c24d3d]">
            City Pulse
          </div>
          <h1 className="mt-4 max-w-3xl text-[28px] font-extrabold leading-[1.05] tracking-[-0.04em] text-[#162033] md:text-[42px]">
            {heroTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#4a5568] md:text-[15px]">{heroSubtitle}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              insights.widgets.weatherEnabled ? 'Weather Live' : null,
              insights.widgets.jokeEnabled ? 'Fresh Joke' : null,
              insights.widgets.nationalNewsEnabled ? 'National News' : null,
              insights.widgets.internationalNewsEnabled ? 'International News' : null,
              insights.newsPreference === 'BALANCED' ? null : `${insights.newsPreference} Focus`,
            ]
              .filter(Boolean)
              .map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#d9e4f4] bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-[#24324b] shadow-[0_8px_18px_rgba(23,32,51,0.06)]"
                >
                  {item}
                </span>
              ))}
          </div>
          {insights.widgets.jokeEnabled && jokeText ? (
            <div className="mt-6 rounded-[22px] border border-[#efe1d7] bg-white/95 p-4 shadow-[0_14px_28px_rgba(18,34,61,0.06)]">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#d05b47]">{insights.widgets.jokePrefix || 'Daily Joke Drop'}</div>
              <p className="mt-2 text-[18px] font-bold leading-7 tracking-[-0.02em] text-[#182233]">{insights.joke?.setup}</p>
              <p className="mt-2 text-[14px] text-[#556277]">{insights.joke?.punchline}</p>
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/listings"
              className="inline-flex rounded-2xl bg-[#1c2740] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(28,39,64,0.22)]"
            >
              Listings Explore Karo
            </Link>
            <Link
              href="/post"
              className="inline-flex rounded-2xl border border-[#dbe4f0] bg-white px-5 py-3 text-sm font-bold text-[#1c2740]"
            >
              Apni Ad Lagao
            </Link>
          </div>
        </div>
        <div className="relative z-[1] grid gap-4">
          {insights.widgets.weatherEnabled ? (
            <div className="rounded-[28px] border border-[#d7e2f1] bg-[#18233a] p-5 text-white shadow-[0_18px_36px_rgba(24,35,58,0.24)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Weather Now</div>
                  <div className="mt-2 text-[30px] font-extrabold tracking-[-0.05em]">{weather ? `${weather.temperatureC}°C` : '--'}</div>
                  <div className="mt-1 text-sm text-white/72">{weather ? weather.description : 'Add OPENWEATHER_API_KEY for live weather'}</div>
                </div>
                <div className="rounded-[22px] border border-white/12 bg-white/8 px-4 py-3 text-right">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Feels Like</div>
                  <div className="mt-2 text-[22px] font-extrabold">{weather?.feelsLikeC != null ? `${weather.feelsLikeC}°` : '--'}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-white/6 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/55">City</div>
                  <div className="mt-2 text-sm font-bold">{weather?.city || insights.city}</div>
                </div>
                <div className="rounded-2xl bg-white/6 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/55">Humidity</div>
                  <div className="mt-2 text-sm font-bold">{weather?.humidity != null ? `${weather.humidity}%` : '--'}</div>
                </div>
                <div className="rounded-2xl bg-white/6 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/55">Wind</div>
                  <div className="mt-2 text-sm font-bold">{weather?.windSpeed != null ? `${weather.windSpeed} m/s` : '--'}</div>
                </div>
              </div>
              {weatherIcon ? (
                <img
                  src={weatherIcon}
                  alt={weather?.description || 'weather icon'}
                  className="pointer-events-none absolute right-4 top-3 h-16 w-16 opacity-85"
                />
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {insights.widgets.nationalNewsEnabled ? (
              <div className="rounded-[24px] border border-[#eadfd8] bg-white/92 p-4 shadow-[0_12px_28px_rgba(18,34,61,0.08)]">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#d05b47]">National Headlines</div>
                <div className="mt-3 space-y-3">
                  {insights.nationalHeadlines.slice(0, 3).map((headline) => (
                    <a
                      key={`${headline.source}-${headline.title}`}
                      href={headline.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => void trackClick(headline, 'NATIONAL')}
                      className="block rounded-2xl border border-[#f1e6df] px-3 py-3 transition hover:bg-[#fff7f3]"
                    >
                      <div className="text-sm font-bold leading-5 text-[#192334]">{headline.title}</div>
                      <div className="mt-1 text-[12px] text-[#6c7587]">{headline.source}</div>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {insights.widgets.internationalNewsEnabled ? (
              <div className="rounded-[24px] border border-[#dfe6f3] bg-white/92 p-4 shadow-[0_12px_28px_rgba(18,34,61,0.08)]">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#4762a8]">International Headlines</div>
                <div className="mt-3 space-y-3">
                  {insights.internationalHeadlines.slice(0, 3).map((headline) => (
                    <a
                      key={`${headline.source}-${headline.title}`}
                      href={headline.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => void trackClick(headline, 'INTERNATIONAL')}
                      className="block rounded-2xl border border-[#e7ecf5] px-3 py-3 transition hover:bg-[#f7faff]"
                    >
                      <div className="text-sm font-bold leading-5 text-[#192334]">{headline.title}</div>
                      <div className="mt-1 text-[12px] text-[#6c7587]">{headline.source}</div>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
