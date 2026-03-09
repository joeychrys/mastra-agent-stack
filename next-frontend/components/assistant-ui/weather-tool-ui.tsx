"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

type WeatherResult = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windGust: number;
  conditions: string;
  location: string;
};

function getWeatherIcon(conditions: string) {
  const lower = conditions.toLowerCase();
  if (lower.includes("thunder")) return ZapIcon;
  if (lower.includes("snow") || lower.includes("grain")) return CloudSnowIcon;
  if (lower.includes("freezing")) return SnowflakeIcon;
  if (lower.includes("rain") || lower.includes("drizzle") || lower.includes("shower"))
    return CloudRainIcon;
  if (lower.includes("fog")) return CloudIcon;
  if (lower.includes("overcast") || lower.includes("cloudy")) return CloudIcon;
  if (lower.includes("clear") || lower.includes("sunny")) return SunIcon;
  return CloudIcon;
}

function WeatherCardLoading() {
  return (
    <div className="my-2 w-full max-w-sm animate-pulse rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <LoaderIcon className="size-4 animate-spin" />
        <span className="text-sm">Fetching weather data...</span>
      </div>
    </div>
  );
}

function WeatherCard({ data }: { data: WeatherResult }) {
  const WeatherIcon = getWeatherIcon(data.conditions);

  return (
    <div className="my-2 w-full max-w-sm overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="bg-linear-to-br from-sky-500/10 to-blue-500/10 px-5 pt-4 pb-3 dark:from-sky-500/5 dark:to-blue-500/5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPinIcon className="size-3.5" />
              <span className="text-sm font-medium">{data.location}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight text-foreground">
                {Math.round(data.temperature)}
              </span>
              <span className="text-lg text-muted-foreground">°C</span>
            </div>
          </div>
          <WeatherIcon className="size-10 text-sky-500 dark:text-sky-400" />
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{data.conditions}</p>
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
    <div className={cn("flex flex-col items-center gap-0.5", className)}>
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export const WeatherToolUI = makeAssistantToolUI<{ location: string }, WeatherResult>({
  toolName: "weatherTool",
  render: ({ result, status }) => {
    if (status.type === "running") return <WeatherCardLoading />;
    if (!result) return null;
    return <WeatherCard data={result} />;
  },
});
