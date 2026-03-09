"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase";
import { PhotoCard } from "@/app/photos/components/PhotoCard";

interface TrainImage {
  id: number;
  image_path: string;
  title: string | null;
  description: string | null;
}

const TrainPage = () => {
  const params = useParams();
  const trainSlug = params.trainslug as string;
  const trainSlugParts = trainSlug.split("_");

  const [photos, setPhotos] = useState<TrainImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getImageUrl = (path: string) => {
    const { data } = supabaseClient.storage
      .from("train-images")
      .getPublicUrl(path);
    return data.publicUrl;
  };

  useEffect(() => {
    const fetchImages = async () => {
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
          .select("id, train_number, operator_id")
          .eq("id", trainId)
          .single();

        if (trainError || !trainData) {
          setError("Train not found");
          setLoading(false);
          return;
        }

        // Fetch train images
        const { data: trainImages, error: imagesError } = await supabaseClient
          .from("train_images")
          .select("id, image_path, title, description")
          .eq("train_id", trainData.id)
          .order("created_at", { ascending: true });

        if (imagesError) {
          setError("Failed to fetch images");
          setLoading(false);
          return;
        }

        setPhotos(trainImages || []);
      } catch (err) {
        setError("Unexpected error");
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [trainSlug]);

  if (loading) return <p>Loading train photos...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Train {trainSlug}</h1>
      {photos.length === 0 ? (
        <p>No photos found for this train.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              getImageUrl={getImageUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainPage;