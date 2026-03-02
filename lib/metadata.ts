import exifr from 'exifr';

export interface ImageMetadata {
    takenAt?: Date;
    location?: {
        latitude: number;
        longitude: number;
    };
    camera?: string;
    width?: number;
    height?: number;
    orientation?: number;
}

export async function extractMetadata(file: File): Promise<ImageMetadata> {
    try {
        const metadata = await exifr.parse(file, {
            exif: true,
            iptc: true,
            icc: false,
            jfif: true
        });

        const gps = await exifr.gps(file);

        console.log('Full metadata extracted:', metadata);
        console.log('GPS extracted via exifr.gps():', gps);

        const result: ImageMetadata = {};

        // Extract date/time
        const date =
            metadata?.DateTimeOriginal ??
            metadata?.CreateDate ??
            metadata?.DateTime;

        if (date) {
            result.takenAt = new Date(date);
        }

        // Extract GPS coordinates (robust for Samsung/Android)
        if (gps?.latitude != null && gps?.longitude != null) {
            result.location = {
                latitude: gps.latitude,
                longitude: gps.longitude
            };
        }

        // Extract camera info
        if (metadata?.Make || metadata?.Model) {
            result.camera = `${metadata?.Make ?? ''} ${metadata?.Model ?? ''}`.trim();
        }

        // Extract dimensions
        result.width = metadata?.ExifImageWidth ?? metadata?.ImageWidth ?? undefined;
        result.height = metadata?.ExifImageHeight ?? metadata?.ImageHeight ?? undefined;

        // Extract orientation
        if (metadata?.Orientation != null) {
            result.orientation = metadata.Orientation;
        }

        return result;
    } catch (error) {
        console.error('Error extracting metadata:', error);
        return {};
    }
}

// Haversine formula to calculate distance between two points
function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}

export async function findNearestStation(
    latitude: number,
    longitude: number,
    supabaseClient: any
): Promise<{ id: number; name: string; distance: number } | null> {
    try {
        // Get all stations from database
        const pageSize = 1000;
        let stations: any[] = [];
        let from = 0;

        while (true) {
            const { data, error } = await supabaseClient
                .from('train_stations')
                .select('id, name, latitude, longitude')
                .range(from, from + pageSize - 1);

            if (error) {
                console.error('Error fetching stations:', error);
                break;
            }

            if (!data || data.length === 0) break;

            stations = stations.concat(data);

            if (data.length < pageSize) break; // last page
            from += pageSize;
        }

        console.log(`Total stations fetched: ${stations.length}`);

        if (!stations || stations.length === 0) {
            return null;
        }

        // Find nearest station
        let nearestStation = null;
        let minDistance = Infinity;

        for (const station of stations) {
            if (station.latitude && station.longitude) {
                const distance = calculateDistance(
                    latitude,
                    longitude,
                    parseFloat(station.latitude),
                    parseFloat(station.longitude)
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestStation = {
                        id: station.id,
                        name: station.name,
                        distance: Math.round(distance * 1000) / 1000 // Round to 3 decimal places
                    };
                }
            }
        }

        return nearestStation;
    } catch (error) {
        console.error('Error finding nearest station:', error);
        return null;
    }
}
