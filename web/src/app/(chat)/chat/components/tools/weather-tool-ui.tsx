'use client';

import { makeAssistantToolUI } from '@assistant-ui/react';
import {
  CloudIcon,
  CloudRainIcon,
  CloudSnowIcon,
  DropletsIcon,
  LoaderIcon,
  MapPinIcon,
  SnowflakeIcon,
  SunIcon,
  ThermometerIcon,
  WindIcon,
  ZapIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type WeatherResult = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windGust: number;
  conditions: string;
  location: string;
};

function WeatherIcon({ conditions, className }: { conditions?: string; className?: string }) {
  if (!conditions) return <CloudIcon className={className} />;
  const lower = conditions.toLowerCase();
  if (lower.includes('thunder')) return <ZapIcon className={className} />;
  if (lower.includes('snow') || lower.includes('grain'))
    return <CloudSnowIcon className={className} />;
  if (lower.includes('freezing')) return <SnowflakeIcon className={className} />;
  if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower'))
    return <CloudRainIcon className={className} />;
  if (lower.includes('fog')) return <CloudIcon className={className} />;
  if (lower.includes('overcast') || lower.includes('cloudy'))
    return <CloudIcon className={className} />;
  if (lower.includes('clear') || lower.includes('sunny')) return <SunIcon className={className} />;
  return <CloudIcon className={className} />;
}

function WeatherCardLoading() {
  return (
    <div className="bg-card my-2 w-full max-w-sm animate-pulse rounded-xl border p-5">
      <div className="text-muted-foreground flex items-center gap-2">
        <LoaderIcon className="size-4 animate-spin" />
        <span className="text-sm">Fetching weather data...</span>
      </div>
    </div>
  );
}

function WeatherCard({ data }: { data: WeatherResult }) {
  return (
    <div className="bg-card my-2 w-full max-w-sm overflow-hidden rounded-xl border shadow-sm">
      <div className="bg-linear-to-br from-sky-500/10 to-blue-500/10 px-5 pt-4 pb-3 dark:from-sky-500/5 dark:to-blue-500/5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-muted-foreground flex items-center gap-1.5">
              <MapPinIcon className="size-3.5" />
              <span className="text-sm font-medium">{data.location}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-foreground text-4xl font-semibold tracking-tight">
                {Math.round(data.temperature)}
              </span>
              <span className="text-muted-foreground text-lg">°C</span>
            </div>
          </div>
          <WeatherIcon
            conditions={data.conditions}
            className="size-10 text-sky-500 dark:text-sky-400"
          />
        </div>
        <p className="text-muted-foreground mt-0.5 text-sm">{data.conditions}</p>
      </div>

      <div className="grid grid-cols-3 divide-x border-t px-1 py-3 text-center">
        <Stat icon={ThermometerIcon} label="Feels like" value={`${Math.round(data.feelsLike)}°`} />
        <Stat icon={DropletsIcon} label="Humidity" value={`${data.humidity}%`} />
        <Stat icon={WindIcon} label="Wind" value={`${Math.round(data.windSpeed)} km/h`} />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      <Icon className="text-muted-foreground size-3.5" />
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-foreground text-sm font-medium">{value}</span>
    </div>
  );
}

export const WeatherToolUI = makeAssistantToolUI<{ location: string }, WeatherResult>({
  toolName: 'weatherTool',
  render: ({ result, status }) => {
    if (status.type === 'running') return <WeatherCardLoading />;
    if (!result || !result.location) return null;
    return <WeatherCard data={result} />;
  },
});
