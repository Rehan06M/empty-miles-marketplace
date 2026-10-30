
type BrandLogoProps = {
  inverse?: boolean;
  compact?: boolean;
};

export function BrandLogo({
  inverse = false,
  compact = false,
}: BrandLogoProps) {
  return (
    <div className="inline-flex items-center gap-3">
      <span
        className={[
          "font-sans text-3xl font-semibold tracking-[-0.08em]",
          inverse ? "text-white" : "text-ink",
        ].join(" ")}
      >
        EM
      </span>

      {!compact && (
        <span
          className={[
            "border-l pl-3 text-[10px] font-semibold",
            "uppercase leading-tight tracking-[0.14em]",
            inverse
              ? "border-white/30 text-white/70"
              : "border-black/20 text-muted",
          ].join(" ")}
        >
          Empty Miles
          <br />
          Marketplace
        </span>
      )}
    </div>
  );
}
