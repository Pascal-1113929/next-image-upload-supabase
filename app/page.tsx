"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useAuthModal } from "@/hooks/useAuthModal";
import { usePhotoUploadModal } from "@/hooks/usePhotoUploadModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  const router = useRouter();
  const { user } = useUser();
  const authModal = useAuthModal();
  const photoUploadModal = usePhotoUploadModal();

  const handleGetStarted = () => {
    if (user) {
      router.push("/photos");
    } else {
      authModal.onOpen();
    }
  };

  const handleUpload = () => {
    if (user) {
      photoUploadModal.onOpen();
    } else {
      authModal.onOpen();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-900">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center space-y-8">
          <div className="flex justify-center">
            <span className="text-8xl">🚂</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-black dark:text-white">
            Welcome to TrainSpotter
          </h1>

          <p className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto">
            Share and discover train photos from around the world.
            Upload your photos with automatic metadata extraction including
            location, date, and nearest station detection.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Button size="lg" onClick={handleGetStarted} className="text-lg px-8 py-6">
              Browse Gallery
            </Button>
            <Button size="lg" variant="outline" onClick={handleUpload} className="text-lg px-8 py-6">
              Upload Photo
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <div className="text-4xl">📸</div>
              <h3 className="text-xl font-semibold">Smart Upload</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Automatic metadata extraction from your photos including GPS coordinates and capture time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <div className="text-4xl">📍</div>
              <h3 className="text-xl font-semibold">Station Detection</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Automatically detect the nearest train station based on GPS data
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <div className="text-4xl">🌍</div>
              <h3 className="text-xl font-semibold">Global Community</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Share your photos with train enthusiasts worldwide or keep them private
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="mt-24 text-center space-y-6 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-12">
          <h2 className="text-3xl font-bold text-black dark:text-white">
            Ready to get started?
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            {user
              ? "Start uploading your train photos now!"
              : "Sign in to start uploading and sharing your train photos"
            }
          </p>
          <Button size="lg" onClick={handleUpload} className="text-lg px-8 py-6">
            {user ? "Upload Your First Photo" : "Sign In to Upload"}
          </Button>
        </div>
      </div>
    </div>
  );
}
