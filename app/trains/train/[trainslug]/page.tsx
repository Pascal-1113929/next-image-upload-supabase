"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase";
import { TrainPhotoCard } from "./components/TrainPhotoCard";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useUser } from "@/hooks/useUser";
import { useAuthModal } from "@/hooks/useAuthModal";

interface TrainImage {
  id: number;
  image_path: string;
  title: string | null;
  description: string | null;
  location: string;
  taken_at?: string;
  is_private?: boolean;
  created_at?: string;
}

interface TrainType {
  id: number;
  name: string;
  class_name: string;
}

interface Train {
  id: number;
  train_number: string;
  alt_number?: string | null;
  type?: TrainType | null;
}

const TrainPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const authModal = useAuthModal();

  const trainSlug = params.trainslug as string;
  const trainSlugParts = trainSlug.split("_");

  const [photos, setPhotos] = useState<TrainImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [train, setTrain] = useState<Train>()

  const getImageUrl = (path: string) => {
    const { data } = supabaseClient.storage
      .from("train-images")
      .getPublicUrl(path);
    return data.publicUrl;
  };

  const handleUploadClick = () => {
    if (!user) {
      authModal.onOpen();
    } else {
      router.push("/photos/upload");
    }
  };

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      setError(null);

      if (trainSlugParts.length !== 2) {
        setError("Invalid train slug format");
        setLoading(false);
        return;
      }

      const operatorSlug = trainSlugParts[0];
      const trainId = parseInt(trainSlugParts[1], 10);

      try {
        // Validate train exists
        const { data: trainData, error: trainError } = await supabaseClient
          .from("trains")
          .select(`*, type:train_types(*)`)
          .eq("id", trainId)
          .single();

        if (trainError || !trainData) {
          setError("Train not found");
          setTrain(trainData)
          setLoading(false);
          return;
        }

        setTrain(trainData)

        const { data: trainImageList, error: trainImageListError } = await supabaseClient
          .from("train_image_trains")
          .select(`
    image:train_images (
      id,
      image_path,
      title,
      description,
      taken_at,
      is_private,
      created_at,
      location:train_image_locations (
          location_type,
          station:train_stations!train_image_locations_station_id_fkey (name),
          station_end:train_stations!train_image_locations_station_id_end_fkey (name)
        )
    ),
    train:trains (
              id,
              train_number,
              alt_number,
              type:train_types (id, name, class_name),
              operator:train_operators (id, name, country_code)
            )
  `)
          .eq("train_id", trainId)

        if (trainImageListError) {
          setError("Failed to fetch images");
          setLoading(false);
          return;
        }

        const trainImages: TrainImage[] = (trainImageList || []).map((rel: any) => {
          const img = rel.image;
          // Compute the location string
          let locationStr = "";
          if (img.location) {
            if (img.location.location_type === "station") {
              locationStr = img.location.station?.name || "";
            } else if (img.location.location_type === "route") {
              const start = img.location.station?.name || "";
              const end = img.location.station_end?.name || "";
              locationStr = `${start} - ${end}`;
            }
          }

          // Map associated trains
          const trains = (rel.train ? [rel.train] : []).map((t: any) => ({
            id: t.id,
            train_number: t.train_number,
            alt_number: t.alt_number,
            type: t.type,
            operator: t.operator,
          }));

          return {
            id: img.id,
            image_path: img.image_path,
            title: img.title,
            description: img.description,
            taken_at: img.taken_at,
            is_private: img.is_private,
            created_at: img.created_at,
            location: locationStr,
            trains
          };
        });

        setPhotos(trainImages || []);
      } catch {
        setError("Unexpected error");
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [trainSlug, user]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
              Train {!train ? trainSlug : (<span>{train.train_number} - {train.type?.name}</span>)}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Browse photos for this specific train
            </p>
          </div>
          <Button onClick={handleUploadClick} size="lg">
            Upload Photo
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-video bg-zinc-200 dark:bg-zinc-800" />
                <CardHeader>
                  <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : photos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-zinc-500 dark:text-zinc-400 mb-4">
              No photos found for this train.
            </p>
            <Button onClick={handleUploadClick}>Upload the first photo</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo) => (
              <TrainPhotoCard key={photo.id} photo={photo} getImageUrl={getImageUrl} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainPage;