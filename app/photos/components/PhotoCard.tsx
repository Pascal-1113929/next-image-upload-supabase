"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

type DbStation = {
    id: number;
    name: string;
    country_code: string;
} | null;

type DbTrainType = {
    id: number;
    name: string;
    class_name: string;
} | null;

type DbOperator = {
    id: number;
    name: string;
    country_code: string | null;
} | null;

type DbTrain = {
    id: number;
    train_number: string;
    alt_number: string | null;
    type: DbTrainType;
    operator: DbOperator;
} | null;

type Location = {
    location_type: string | null; // ← FIX
    station_id: number | null;
    station_id_end: number | null;
    station?: DbStation;
    station_end?: DbStation;
} | null;

export type Photo = {
    id: string | number;
    image_path: string;
    title?: string | null;
    description?: string | null;
    is_private?: boolean;
    taken_at: string | number | Date;
    location?: Location;
    train?: DbTrain;
};

type PhotoCardProps = {
    photo: Photo;
    getImageUrl: (path: string) => string;
};

export function PhotoCard({ photo, getImageUrl }: PhotoCardProps) {
    const router = useRouter();

    const renderLocation = () => {
        if (!photo.location) return "Unknown";

        if (photo.location.location_type === "route") {
            const s1 = photo.location.station;
            const s2 = photo.location.station_end;
            return (
                <span>
                    {s1?.name || "Unknown"}{" "}
                    <span className="text-xs">({s1?.country_code || "??"})</span>
                    {" - "}
                    {s2?.name || "Unknown"}{" "}
                    <span className="text-xs">({s2?.country_code || "??"})</span>
                </span>
            );
        }

        const s = photo.location.station;
        return (
            <span>
                {s?.name || "Unknown"}{" "}
                <span className="text-xs">({s?.country_code || "??"})</span>
            </span>
        );
    };

    function formatTrainLabel(train: DbTrain) {
        if (!train) return "—";

        // Map full operator name → short label
        const OPERATOR_SHORT: Record<string, string> = {
            "Nederlandse Spoorwegen": "NS",
            "SNCF": "SNCF",
            "VIAS GmbH": "VIAS",
        };

        const operator = OPERATOR_SHORT[train.operator.name] ?? train.operator.name ?? "—";

        // Pick trainType
        const type = train.type?.name ?? "";

        // Use main number
        const number = train.train_number + (train.alt_number ? ` - ${train.alt_number}` : "");

        return `${operator} ${type} • ${number}`.trim();
    }

    return (
        <Card
            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push(`/photos/${photo.id}`)}
        >
            <div className="relative aspect-video bg-zinc-200 dark:bg-zinc-800">
                <Image
                    src={getImageUrl(photo.image_path)}
                    alt={photo.title || "Train photo"}
                    fill
                    className="object-cover"
                />
                {photo.is_private && (
                    <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                        Private
                    </div>
                )}
            </div>

            <CardHeader>
                <CardTitle className="line-clamp-1">
                    {photo.title || "Untitled"}
                </CardTitle>

                <CardDescription className="space-y-1">
                    <div className="flex items-center gap-1">
                        <span>📍</span>
                        {renderLocation()}
                    </div>

                    <div className="flex items-center gap-1">
                        <span>📅</span>
                        <span>{new Date(photo.taken_at).toLocaleDateString()}</span>
                    </div>
                </CardDescription>
                {photo.train && (
                    <div className="flex items-center gap-1">
                        <span>🚆</span>
                        <span className="font-medium">{formatTrainLabel(photo.train)}</span>
                    </div>
                )}
            </CardHeader>

            {photo.description && (
                <CardContent>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                        {photo.description}
                    </p>
                </CardContent>
            )}
        </Card>
    );
}