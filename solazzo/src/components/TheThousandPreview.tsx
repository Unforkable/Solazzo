import Image from "next/image";
import type { ThousandSnapshot } from "@/lib/the-thousand";

export function TheThousandPreview({ snapshot }: { snapshot: ThousandSnapshot }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {snapshot.tiles.map((tile, i) =>
        tile.kind === "claim-cta" ? (
          <a
            key={i}
            href={tile.href}
            className="stage-image-wrap aspect-square flex flex-col items-center justify-center border border-muted/20 text-center px-4 hover:border-muted/40 transition-colors"
          >
            <p className="font-serif-display text-sm text-foreground/80 mb-1">
              Your place
            </p>
            <p className="text-xs text-muted/60">Claim your portrait &rarr;</p>
          </a>
        ) : (
          <figure key={i} className="stage-image-wrap aspect-square relative">
            <Image
              src={tile.src}
              alt={tile.alt}
              fill
              sizes="(min-width: 640px) 200px, 50vw"
              className="object-cover"
              unoptimized={tile.src.startsWith("http")}
            />
            <figcaption className="absolute bottom-0 left-0 right-0 bg-background/70 backdrop-blur-sm px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted/80 flex items-center justify-between">
              <span>{tile.label}</span>
              {tile.sublabel && (
                <span className="text-muted/50 normal-case tracking-normal">
                  {tile.sublabel}
                </span>
              )}
            </figcaption>
          </figure>
        )
      )}
    </div>
  );
}
