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
            gps: true,
            exif: true,
            iptc: true,
            icc: false,
            jfif: true
        });

        const result: ImageMetadata = {};

        // Extract date/time
        if (metadata?.DateTimeOriginal) {
            result.takenAt = new Date(metadata.DateTimeOriginal);
        } else if (metadata?.DateTime) {
            result.takenAt = new Date(metadata.DateTime);
        } else if (metadata?.CreateDate) {
            result.takenAt = new Date(metadata.CreateDate);
        }

        // Extract GPS coordinates
        if (metadata?.latitude && metadata?.longitude) {
            result.location = {
                latitude: metadata.latitude,
                longitude: metadata.longitude
            };
        }

        // Extract camera info
        if (metadata?.Make && metadata?.Model) {
            result.camera = `${metadata.Make} ${metadata.Model}`.trim();
        } else if (metadata?.Model) {
            result.camera = metadata.Model;
        }

        // Extract dimensions
        if (metadata?.ImageWidth && metadata?.ImageHeight) {
            result.width = metadata.ImageWidth;
            result.height = metadata.ImageHeight;
        } else if (metadata?.ExifImageWidth && metadata?.ExifImageHeight) {
            result.width = metadata.ExifImageWidth;
            result.height = metadata.ExifImageHeight;
        }

        // Extract orientation
        if (metadata?.Orientation) {
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
        const { data: stations, error } = await supabaseClient
            .from('train_stations')
            .select('id, name, latitude, longitude');

        if (error) {
            console.error('Error fetching stations:', error);
            return null;
        }

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
