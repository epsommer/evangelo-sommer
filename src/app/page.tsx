import Gallery3D from "@/components/gallery/Gallery3D";

export default function DevelopmentPage() {
  return (
    <main className="w-full h-screen">
      {/* Development Badge */}
      <div className="fixed top-4 left-4 z-40 bg-yellow-500 text-black px-3 py-1 rounded text-sm font-bold">
        DEVELOPMENT
      </div>

      {/* 3D Gallery */}
      <Gallery3D />
    </main>
  );
}
