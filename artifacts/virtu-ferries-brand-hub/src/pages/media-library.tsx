import { motion } from "framer-motion";
import { MediaLibrary } from "@/components/MediaLibrary";

export default function MediaLibraryPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-6xl mx-auto pb-24"
    >
      <header className="space-y-3 mb-10">
        <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900">Media Library</h1>
        <p className="text-lg text-gray-500 font-light max-w-2xl">
          Photography, video and reference files for the team. Upload once, reuse everywhere.
        </p>
      </header>

      <MediaLibrary hideHeader />
    </motion.div>
  );
}
