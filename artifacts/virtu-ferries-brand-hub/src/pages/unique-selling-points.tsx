import { motion } from "framer-motion";
import { Anchor } from "lucide-react";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";

export default function UniqueSellingPoints() {
  const { usp } = useBrandContent();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-4xl mx-auto space-y-14 pb-24"
    >
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-[var(--brand-primary)] text-sm font-semibold uppercase tracking-widest">
          <Anchor className="w-4 h-4" />
          {usp.headerKicker}
        </div>
        <h1 className="font-extrabold text-4xl md:text-5xl text-[#18181B]">Unique Selling Points</h1>
        <p className="text-lg text-[#71717A] font-light max-w-2xl">{usp.headerSubtitle}</p>
      </header>

      {usp.sections.length === 0 ? (
        <EmptySection
          title="USPs not configured yet"
          message="Add the brand's route, fleet, onboard experience, value positioning, audiences, and competitive angles for this brand and they will appear here."
        />
      ) : (
        <div className="space-y-10">
          {usp.sections.map(({ title, color, items }) => (
            <motion.section
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-extrabold text-[#18181B] flex items-center gap-3">
                <span className="w-6 h-[3px] rounded-full shrink-0" style={{ backgroundColor: color }} />
                {title}
              </h2>
              <ul className="space-y-3 pl-1">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-[#3F3F46] leading-relaxed">
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-[7px] shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.section>
          ))}
        </div>
      )}
    </motion.div>
  );
}
